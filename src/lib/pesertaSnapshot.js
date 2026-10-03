// src/lib/pesertaSnapshot.js
// Utilitas penyimpanan & pembacaan snapshot peserta di Supabase Storage
// Mencegah N Firestore reads saat membuka halaman event detail atau mengekspor links

import { supabase, ASSET_BUCKET } from "@/lib/supabase";

/**
 * Menghasilkan kunci acak unguessable (UUID) untuk melindungi URL snapshot
 */
export function generateSnapshotKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substring(2, 10) +
    "-" +
    Math.random().toString(36).substring(2, 10)
  );
}

/**
 * Normalisasi data peserta untuk disimpan ke berkas snapshot
 */
function normalizeParticipants(list) {
  if (!Array.isArray(list)) return [];
  return list.map((p, idx) => ({
    id: String(p.id || `p_${idx}`),
    nama: String(p.nama || ""),
    email: String(p.email || ""),
    nomorUrut: Number(p.nomorUrut) || idx + 1,
    attributes: p.attributes && typeof p.attributes === "object" ? p.attributes : {},
  }));
}

/**
 * Mengunggah seluruh daftar peserta ke Supabase Storage dalam format JSON terkompresi
 * @param {string} eventId
 * @param {Array} participantsList
 * @param {string|null} existingKey
 * @returns {Promise<{ success: boolean, snapshotKey: string }>}
 */
export async function uploadSnapshot(eventId, participantsList, existingKey = null) {
  if (!eventId) throw new Error("eventId wajib disertakan saat upload snapshot.");

  const snapshotKey = existingKey || generateSnapshotKey();
  const filePath = `events/${eventId}/snapshot_${snapshotKey}.json`;
  const normalizedList = normalizeParticipants(participantsList);
  const jsonContent = JSON.stringify(normalizedList);

  const payload =
    typeof Buffer !== "undefined"
      ? Buffer.from(jsonContent, "utf-8")
      : new Blob([jsonContent], { type: "application/json" });

  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(filePath, payload, {
    contentType: "application/json",
    upsert: true,
  });

  if (error) {
    console.error("Gagal mengunggah snapshot ke Supabase:", error);
    throw new Error("Gagal menyimpan snapshot peserta: " + error.message);
  }

  // Jika kunci baru dibuat dan kunci lama berbeda, bersihkan berkas lama di latar belakang
  if (existingKey && existingKey !== snapshotKey) {
    try {
      await supabase.storage.from(ASSET_BUCKET).remove([`events/${eventId}/snapshot_${existingKey}.json`]);
    } catch (e) {
      console.warn("Gagal menghapus snapshot usang:", e);
    }
  }

  return { success: true, snapshotKey };
}

/**
 * Mengambil data seluruh peserta dari Supabase Storage
 * @param {string} eventId
 * @param {string} snapshotKey
 * @returns {Promise<Array|null>} Mengembalikan null jika belum ada atau gagal dibaca
 */
export async function fetchSnapshot(eventId, snapshotKey) {
  if (!eventId || !snapshotKey) return null;

  try {
    const filePath = `events/${eventId}/snapshot_${snapshotKey}.json`;
    const { data, error } = await supabase.storage.from(ASSET_BUCKET).download(filePath);

    if (error || !data) {
      console.warn(`Snapshot ${filePath} tidak ditemukan di Supabase Storage:`, error?.message);
      return null;
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn("Gagal membaca atau mem-parsing snapshot peserta:", err?.message);
    return null;
  }
}
