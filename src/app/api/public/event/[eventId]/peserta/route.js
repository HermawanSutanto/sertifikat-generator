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

// GET /api/public/event/[eventId]/peserta
// Akses tanpa token dinonaktifkan demi efisiensi kuota dan keamanan privasi peserta
export async function GET() {
  return json(
    {
      error: "disabled",
      message: "Akses tanpa token dinonaktifkan untuk menghemat kuota. Gunakan tautan sertifikat resmi.",
    },
    403
  );
}