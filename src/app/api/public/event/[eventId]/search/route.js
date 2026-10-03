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

// GET /api/public/event/[eventId]/search?q=...  (hanya jika pencarian mandiri aktif)
// Mengembalikan nama dan ID saja. Email dan kolom lain tidak pernah dikirim.
export async function GET(request, { params }) {
  try {
    const { eventId } = await params;
    if (!(await rateLimit(`s:${eventId}:${clientIp(request)}`, 30, 60))) return TOO_MANY();

    const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 80);
    if (q.length < MIN_CHARS) return json({ results: [] });

    const event = await loadEvent(eventId);
    if (!event || !sharingState(event).cariMandiri) return json({ error: "closed" }, 404);

    const needle = q.toLowerCase();
    const results = (await listParticipantNames(eventId))
      .map((p) => ({ ...p, pos: p.nama.toLowerCase().indexOf(needle) }))
      .filter((p) => p.pos >= 0)
      .sort((a, b) => a.pos - b.pos || a.nama.localeCompare(b.nama))
      .slice(0, MAX_RESULTS)
      .map(({ id, nama }) => ({ id, nama }));

    return json({ results });
  } catch (err) {
    console.error("GET /api/public/event/search:", err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
}