// File  : app/api/public/event/[eventId]/route.js
// URL   : GET /api/public/event/{eventId}             -> mode "cari" (jika pencarian mandiri aktif)
//         GET /api/public/event/{eventId}?t={token}   -> mode "peserta" (satu sertifikat milik pemegang token)
// Akses : publik (tanpa login), mengikuti checkbox panitia; batas 60 permintaan/menit per IP

import {
  json,
  loadEvent,
  sharingState,
  publicEvent,
  publicParticipant,
  allowedAttributeKeys,
  getParticipantDoc,
  verifyToken,
  rateLimit,
  clientIp,
  TOO_MANY,
} from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/event/[eventId]            -> mode "cari" (jika pencarian mandiri aktif)
// GET /api/public/event/[eventId]?t=<token>  -> mode "peserta" (hanya sertifikat pemilik token)
export async function GET(request, { params }) {
  try {
    const { eventId } = await params;
    if (!(await rateLimit(`ev:${eventId}:${clientIp(request)}`, 60, 60))) return TOO_MANY();

    const token = new URL(request.url).searchParams.get("t");
    const event = await loadEvent(eventId);
    // Event tidak ada dan akses belum dibuka dijawab sama agar ID event tidak bisa ditebak.
    if (!event) return json({ error: "closed" }, 404);

    const sharing = sharingState(event);

    if (token) {
      if (!sharing.perPeserta) return json({ error: "invalid" }, 404);
      const participantId = verifyToken(eventId, token, sharing.epoch);
      if (!participantId) return json({ error: "invalid" }, 404);
      const found = await getParticipantDoc(eventId, participantId);
      if (!found) return json({ error: "invalid" }, 404);
      return json({
        mode: "peserta",
        event: publicEvent(event),
        participant: publicParticipant(found.id, found.data, allowedAttributeKeys(event)),
      });
    }

    if (sharing.cariMandiri) {
      return json({ mode: "cari", event: publicEvent(event) });
    }
    return json({ error: "closed" }, 404);
  } catch (err) {
    console.error("GET /api/public/event:", err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
}