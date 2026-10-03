// File  : app/api/public/event/[eventId]/revisi/route.js
// URL   : POST /api/public/event/{eventId}/revisi
// Body  : { t, namaBaru }  atau  { participantId, namaBaru }
// Akses : publik, mengikuti checkbox panitia; batas 10/jam per IP dan 3/jam per peserta

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  json,
  loadEvent,
  sharingState,
  getParticipantDoc,
  verifyToken,
  parseTokenId,
  tokenVersion,
  isValidId,
  rateLimit,
  clientIp,
  TOO_MANY,
} from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { eventId } = await params;
    const ip = clientIp(request);
    if (!(await rateLimit(`rv:${eventId}:${ip}`, 10, 3600))) return TOO_MANY();

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Permintaan tidak valid." }, 400);
    }

    const namaBaru = String(body?.namaBaru || "").replace(/\s+/g, " ").trim();
    if (namaBaru.length < 1 || namaBaru.length > 200) {
      return json({ error: "Nama harus 1 sampai 200 karakter." }, 400);
    }

    const event = await loadEvent(eventId);
    if (!event) return json({ error: "closed" }, 404);
    const sharing = sharingState(event);

    let found = null;
    if (body?.t) {
      if (!sharing.perPeserta) return json({ error: "invalid" }, 404);
      const pid = parseTokenId(body.t);
      const doc = pid ? await getParticipantDoc(eventId, pid) : null;
      if (doc && verifyToken(eventId, body.t, sharing.epoch, tokenVersion(doc.data))) {
        found = doc;
      }
    }
    if (!found) return json({ error: "invalid" }, 404);

    const participantId = found.id;
    if (!(await rateLimit(`rvp:${eventId}:${participantId}`, 3, 3600))) return TOO_MANY();

    if (String(found.data.nama || "") === namaBaru) {
      return json({ error: "Nama baru sama dengan nama saat ini." }, 400);
    }

    await getAdminDb().collection(`events/${eventId}/revisi_nama`).add({
      participantId,
      namaLama: String(found.data.nama || ""),
      email: String(found.data.email || ""),
      namaBaru,
      status: "pending",
      dibuatPada: FieldValue.serverTimestamp(),
    });

    return json({ ok: true });
  } catch (err) {
    console.error("POST /api/public/event/revisi:", err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
}