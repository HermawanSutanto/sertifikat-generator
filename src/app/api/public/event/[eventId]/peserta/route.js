// File  : app/api/public/event/[eventId]/peserta/route.js
// URL   : GET /api/public/event/{eventId}/peserta?id={participantId}
// Akses : publik, hanya jika "Pencarian mandiri" aktif; batas 60 permintaan/menit per IP

import {
  json,
  loadEvent,
  sharingState,
  publicParticipant,
  allowedAttributeKeys,
  getParticipantDoc,
  isValidId,
  rateLimit,
  clientIp,
  TOO_MANY,
} from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/event/[eventId]/peserta?id=<participantId>  (hanya mode pencarian mandiri)
export async function GET(request, { params }) {
  try {
    const { eventId } = await params;
    if (!(await rateLimit(`p:${eventId}:${clientIp(request)}`, 60, 60))) return TOO_MANY();

    const id = new URL(request.url).searchParams.get("id");
    if (!isValidId(id)) return json({ error: "invalid" }, 404);

    const event = await loadEvent(eventId);
    if (!event || !sharingState(event).cariMandiri) return json({ error: "closed" }, 404);

    const found = await getParticipantDoc(eventId, id);
    if (!found) return json({ error: "invalid" }, 404);

    return json({
      participant: publicParticipant(found.id, found.data, allowedAttributeKeys(event)),
    });
  } catch (err) {
    console.error("GET /api/public/event/peserta:", err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
}