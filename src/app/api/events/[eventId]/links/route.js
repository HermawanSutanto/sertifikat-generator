// File  : app/api/events/[eventId]/links/route.js
// URL   : GET /api/events/{eventId}/links
// Header: Authorization: Bearer {Firebase ID token}
// Akses : hanya pemilik event, dan hanya jika "Tautan per peserta" aktif

import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { json, loadEvent, sharingState, makeToken } from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/events/[eventId]/links  (header Authorization: Bearer <Firebase ID token>)
// Hanya pemilik event. Mengembalikan tautan unik tiap peserta untuk dibagikan panitia.
export async function GET(request, { params }) {
  try {
    const { eventId } = await params;

    const header = request.headers.get("authorization") || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return json({ error: "Perlu login." }, 401);

    let uid;
    try {
      uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
    } catch {
      return json({ error: "Sesi tidak valid. Silakan login ulang." }, 401);
    }

    const event = await loadEvent(eventId);
    if (!event || event.userId !== uid) return json({ error: "Akses ditolak." }, 403);

    const sharing = sharingState(event);
    if (!sharing.perPeserta) {
      return json({ error: "Aktifkan opsi tautan per peserta terlebih dahulu." }, 409);
    }

    const snap = await getAdminDb()
      .collection(`events/${eventId}/peserta`)
      .select("nama", "email", "nomorUrut")
      .get();

    const origin = new URL(request.url).origin;
    const links = snap.docs
      .map((d) => ({
        nomorUrut: Number(d.get("nomorUrut")) || 0,
        nama: String(d.get("nama") || ""),
        email: String(d.get("email") || ""),
        url: `${origin}/sertifikat/${eventId}?t=${encodeURIComponent(
          makeToken(eventId, d.id, sharing.epoch)
        )}`,
      }))
      .sort((a, b) => a.nomorUrut - b.nomorUrut);

    return json({ links });
  } catch (err) {
    console.error("GET /api/events/links:", err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
}   