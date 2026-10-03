// File  : app/api/events/[eventId]/links/route.js
// URL   : GET /api/events/{eventId}/links            -> tautan semua peserta
//         GET /api/events/{eventId}/links?id={pid}   -> tautan satu peserta
// Header: Authorization: Bearer {Firebase ID token}
// Akses : hanya pemilik event, dan hanya jika "Tautan per peserta" aktif

import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import {
  json,
  loadEvent,
  sharingState,
  makeToken,
  tokenVersion,
  getParticipantDoc,
  isValidId,
} from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/events/[eventId]/links  (header Authorization: Bearer <Firebase ID token>)
// Hanya pemilik event. Mengembalikan tautan unik peserta untuk dibagikan panitia.
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

    const url = new URL(request.url);
    const origin = url.origin;

    const buildLink = (id, data) => ({
      nomorUrut: Number(data.nomorUrut) || 0,
      nama: String(data.nama || ""),
      email: String(data.email || ""),
      url: `${origin}/sertifikat/${eventId}?t=${encodeURIComponent(
        makeToken(eventId, id, sharing.epoch, tokenVersion(data))
      )}`,
    });

    // Mode satu peserta: dipakai setelah tautan seseorang dicabut dan diterbitkan ulang.
    const only = url.searchParams.get("id");
    if (only !== null) {
      if (!isValidId(only)) return json({ error: "ID peserta tidak valid." }, 400);
      const found = await getParticipantDoc(eventId, only);
      if (!found) return json({ error: "Peserta tidak ditemukan." }, 404);
      return json({ links: [buildLink(found.id, found.data)] });
    }

    // Mode semua peserta
    const snap = await getAdminDb()
      .collection(`events/${eventId}/peserta`)
      .select("nama", "email", "nomorUrut", "tv")
      .get();

    const links = snap.docs
      .map((d) =>
        buildLink(d.id, {
          nomorUrut: d.get("nomorUrut"),
          nama: d.get("nama"),
          email: d.get("email"),
          tv: d.get("tv"),
        })
      )
      .sort((a, b) => a.nomorUrut - b.nomorUrut);

    return json({ links });
  } catch (err) {
    console.error("GET /api/events/links:", err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
}