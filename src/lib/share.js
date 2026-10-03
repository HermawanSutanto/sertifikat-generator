// Logika berbagi publik: token per peserta, proyeksi data, cache, dan rate limit.
import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "./firebaseAdmin";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const PLACEHOLDER = /\{([^{}:]+)(?::[^{}]*)?\}/g;

export const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const isValidId = (value) => typeof value === "string" && ID_PATTERN.test(value);

// ---------- Token tautan per peserta (HMAC, tanpa penyimpanan) ----------
function getSecret() {
  const secret = process.env.SHARE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SHARE_SECRET belum diatur atau kurang dari 32 karakter.");
  }
  return secret;
}

export function makeToken(eventId, participantId, epoch) {
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(`${eventId}:${participantId}:${epoch}`)
    .digest("base64url")
    .slice(0, 22);
  return `${participantId}.${sig}`;
}

// Mengembalikan participantId jika token sah, selain itu null.
export function verifyToken(eventId, token, epoch) {
  if (typeof token !== "string" || token.length > 200) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const participantId = token.slice(0, dot);
  if (!isValidId(participantId)) return null;

  const expected = Buffer.from(makeToken(eventId, participantId, epoch));
  const received = Buffer.from(token);
  if (expected.length !== received.length) return null;
  return crypto.timingSafeEqual(expected, received) ? participantId : null;
}

// ---------- Event & pengaturan berbagi ----------
export async function loadEvent(eventId) {
  if (!isValidId(eventId)) return null;
  const snap = await getAdminDb().collection("events").doc(eventId).get();
  return snap.exists ? snap.data() : null;
}

export function sharingState(event) {
  const s = event?.sharing || {};
  return {
    cariMandiri: s.cariMandiri === true,
    perPeserta: s.perPeserta === true,
    epoch: Number.isInteger(s.epoch) ? s.epoch : 1,
  };
}

// Hanya data yang dibutuhkan untuk merender sertifikat. userId dan field lain tidak dikirim.
export function publicEvent(event) {
  const refs = event.storageRefs || {};
  return {
    namaEvent: event.namaEvent || "",
    tanggalEvent: event.tanggalEvent || "",
    filenamePattern: event.filenamePattern || "",
    configs: Array.isArray(event.configs) ? event.configs : [],
    storageRefs: {
      templatePdf: refs.templatePdf?.url ? { url: refs.templatePdf.url } : null,
      customFont: refs.customFont?.url ? { url: refs.customFont.url } : null,
    },
  };
}

// Kolom CSV yang benar-benar dipakai template/nama berkas. Kolom lain tidak dikirim.
export function allowedAttributeKeys(event) {
  const keys = new Set(["Nama"]);
  for (const cfg of event.configs || []) {
    if (cfg.enabled === false || cfg.type === "image") continue;
    if (cfg.column_name) keys.add(String(cfg.column_name));
    if (cfg.is_custom_var && cfg.custom_var_name) keys.add(String(cfg.custom_var_name));
    if (cfg.static_text) {
      for (const m of String(cfg.static_text).matchAll(PLACEHOLDER)) keys.add(m[1].trim());
    }
  }
  if (event.filenamePattern) {
    for (const m of String(event.filenamePattern).matchAll(PLACEHOLDER)) keys.add(m[1].trim());
  }
  return keys;
}

// Email tidak pernah ikut dikirim ke publik.
export function publicParticipant(id, data, allowedKeys) {
  const attributes = {};
  for (const [key, value] of Object.entries(data.attributes || {})) {
    if (allowedKeys.has(key)) attributes[key] = value;
  }
  const nama = String(data.nama || "");
  return {
    id,
    nama,
    nomorUrut: Number(data.nomorUrut) || 1,
    attributes: Object.keys(attributes).length ? attributes : { Nama: nama },
  };
}

export async function getParticipantDoc(eventId, participantId) {
  if (!isValidId(participantId)) return null;
  const snap = await getAdminDb()
    .collection(`events/${eventId}/peserta`)
    .doc(participantId)
    .get();
  return snap.exists ? { id: snap.id, data: snap.data() } : null;
}

// ---------- Daftar nama untuk pencarian (cache singkat agar tidak membaca ulang tiap ketikan) ----------
const nameCache = new Map();
const NAME_CACHE_TTL_MS = 120_000;

export async function listParticipantNames(eventId) {
  const hit = nameCache.get(eventId);
  if (hit && Date.now() - hit.at < NAME_CACHE_TTL_MS) return hit.list;

  const snap = await getAdminDb()
    .collection(`events/${eventId}/peserta`)
    .select("nama", "nomorUrut")
    .get();
  const list = snap.docs.map((d) => ({
    id: d.id,
    nama: String(d.get("nama") || ""),
    nomorUrut: Number(d.get("nomorUrut")) || 0,
  }));

  nameCache.set(eventId, { at: Date.now(), list });
  if (nameCache.size > 50) nameCache.delete(nameCache.keys().next().value);
  return list;
}

// ---------- Rate limit ----------
// Memakai Upstash Redis (REST) jika env tersedia; jika tidak, memori per instance (hanya cadangan).
const memoryBuckets = new Map();

export async function rateLimit(key, limit, windowSec) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSec, "NX"],
        ]),
        cache: "no-store",
      });
      const data = await res.json();
      const count = Number(data?.[0]?.result);
      if (Number.isFinite(count)) return count <= limit;
    } catch (err) {
      console.warn("Rate limit Upstash gagal, memakai cadangan memori:", err?.message);
    }
  }

  const now = Date.now();
  if (memoryBuckets.size > 5000) {
    for (const [k, v] of memoryBuckets) if (v.reset < now) memoryBuckets.delete(k);
  }
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.reset < now) {
    memoryBuckets.set(key, { n: 1, reset: now + windowSec * 1000 });
    return true;
  }
  bucket.n += 1;
  return bucket.n <= limit;
}

export function clientIp(request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export const TOO_MANY = () => json({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, 429);