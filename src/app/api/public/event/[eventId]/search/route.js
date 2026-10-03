// File  : app/api/public/event/[eventId]/search/route.js
// URL   : GET /api/public/event/{eventId}/search?q={kata}
// Akses : publik, hanya jika "Pencarian mandiri" aktif; batas 30 permintaan/menit per IP

import {
  json,
  loadEvent,
  sharingState,
  listParticipantNames,
  rateLimit,
  clientIp,
  TOO_MANY,
} from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_CHARS = 3;
const MAX_RESULTS = 8;

// GET /api/public/event/[eventId]/search
// Fitur pencarian mandiri dinonaktifkan permanen demi menghemat kuota baca Firestore
export async function GET() {
  return json(
    {
      error: "disabled",
      message: "Fitur pencarian mandiri dinonaktifkan untuk menghemat kuota. Gunakan tautan resmi per peserta.",
    },
    403
  );
}