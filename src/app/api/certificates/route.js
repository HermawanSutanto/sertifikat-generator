import { db } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  Timestamp,
  documentId
} from "firebase/firestore";
import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";
import { supabaseAdmin as supabase } from "../../../lib/supabaseAdmin";

const PAGE_SIZE = 20; // Jumlah sertifikat yang akan diambil per halaman (GET)

// PATCH: batas jumlah sertifikat yang dihapus per SATU request DELETE.
// Kalau user punya ribuan sertifikat, menghapus semuanya dalam satu request
// berisiko timeout function di Vercel. Jadi endpoint ini hanya memproses
// satu "halaman" penghapusan per panggilan (di bawah limit writeBatch
// Firestore 500 operasi), dan mengembalikan `hasMore: true` kalau masih ada
// sisa — client (dashboard) yang memanggil endpoint ini berulang kali
// sampai `hasMore` bernilai false. Angka ini SENGAJA sama dengan pola query
// (where userId + orderBy dibuatPada) yang dipakai GET di bawah, supaya
// memakai index Firestore yang sama (tidak perlu index composite baru).
const DELETE_BATCH_SIZE = 400;

// Batas jumlah path yang dihapus dalam satu panggilan
// supabase.storage.remove(). Dibatasi supaya payload request tidak
// terlalu besar untuk sekali panggil, bukan karena ada limit resmi
// yang didokumentasikan Supabase.
const STORAGE_REMOVE_CHUNK_SIZE = 100;

// Firestore "in" query hanya mendukung maksimum 30 nilai per query, dipakai
// saat menghapus sertifikat terpilih (ids) lewat checklist di dashboard.
const FIRESTORE_IN_CHUNK_SIZE = 30;

// Batas jumlah id yang boleh dikirim sekaligus untuk hapus-terpilih per
// request, supaya payload/berapa banyak dokumen yang diverifikasi+dihapus
// dalam satu request tetap terkendali (di bawah limit writeBatch 500).
const MAX_SELECTED_DELETE_IDS = 450;

const CERTIFICATE_BUCKET = "generated-certificates";

// Ekstrak path file relatif terhadap bucket dari sebuah Supabase Storage
// public URL. Sama seperti helper yang dipakai di api/zip-certificates,
// menangani pola "/object/public/<bucket>/<path>" maupun
// "/object/sign/<bucket>/<path>".
function extractStoragePath(publicUrl, bucketName) {
  try {
    const url = new URL(publicUrl);
    const marker = `/${bucketName}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    const rawPath = url.pathname.slice(markerIndex + marker.length);
    return rawPath ? decodeURIComponent(rawPath) : null;
  } catch {
    return null;
  }
}

async function verifyAuth(req) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ message: "Token tidak ditemukan atau format salah" }, { status: 401 }) };
  }
  const idToken = authorization.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (!decodedToken.uid) {
      return { error: NextResponse.json({ message: "UID tidak ditemukan di dalam token" }, { status: 403 }) };
    }
    return { uid: decodedToken.uid };
  } catch (error) {
    return { error: NextResponse.json({ message: "Sesi tidak valid atau kadaluwarsa" }, { status: 403 }) };
  }
}

export async function GET(req) {
  try {
    // 1. Verifikasi Token Otentikasi
    const { uid, error: authError } = await verifyAuth(req);
    if (authError) return authError;

    // --- LOGIKA PAGINATION DIMULAI DI SINI ---

    const { searchParams } = new URL(req.url);
    // Cursor berupa timestamp milidetik dari dokumen terakhir di halaman
    // sebelumnya (lihat lastVisibleTimestamp pada response). Ini menghindari
    // 1 extra Firestore read (getDoc) per halaman yang sebelumnya diperlukan
    // hanya untuk mendapatkan snapshot dokumen sebagai titik awal startAfter.
    const lastVisibleMillis = searchParams.get("lastVisible");

    const certificatesRef = collection(db, "sertifikat_terbuat");

    const queryConstraints = [
      where("userId", "==", uid),
      orderBy("dibuatPada", "desc"),
      limit(PAGE_SIZE)
    ];

    if (lastVisibleMillis && !Number.isNaN(Number(lastVisibleMillis))) {
      queryConstraints.push(
        startAfter(Timestamp.fromMillis(Number(lastVisibleMillis)))
      );
    }

    const q = query(certificatesRef, ...queryConstraints);

    // --- LOGIKA PAGINATION SELESAI ---

    const querySnapshot = await getDocs(q);
    const certificates = [];
    querySnapshot.forEach((doc) => {
      certificates.push({ id: doc.id, ...doc.data() });
    });

    // Dapatkan cursor (timestamp dalam ms) dari dokumen terakhir untuk
    // halaman berikutnya. Client mengirim balik nilai ini sebagai
    // `lastVisible` pada request paginasi selanjutnya.
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    const lastDocId = lastDoc?.id || null;
    const lastVisibleTimestamp =
      lastDoc?.data()?.dibuatPada?.toMillis?.() || null;
    const hasMore = certificates.length === PAGE_SIZE;

    return NextResponse.json({
      certificates,
      lastDocId,
      lastVisibleTimestamp,
      hasMore
    });
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data sertifikat", error: error.message },
      { status: 500 }
    );
  }
}

// Hapus SEMUA sertifikat milik user yang sedang login: satu "halaman"
// (maks DELETE_BATCH_SIZE dokumen) per panggilan — file di Supabase Storage
// DAN dokumen metadata di Firestore. Client memanggil endpoint ini berulang
// kali selama response mengembalikan hasMore: true.
export async function DELETE(req) {
  try {
    const { uid, error: authError } = await verifyAuth(req);
    if (authError) return authError;

    // PATCH: dashboard sekarang bisa mengirim daftar `ids` (hasil checklist
    // pilih-sertifikat) di body JSON untuk menghapus HANYA sertifikat yang
    // dipilih user. Kalau body kosong/tidak ada `ids`, perilaku lama
    // dipertahankan: hapus semua sertifikat user per-halaman (hasMore loop).
    let requestedIds = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) requestedIds = body.ids;
    } catch {
      // Body kosong/bukan JSON valid -> anggap mode "hapus semua" (lama).
    }

    if (requestedIds.length > MAX_SELECTED_DELETE_IDS) {
      return NextResponse.json(
        {
          message: `Maksimum ${MAX_SELECTED_DELETE_IDS} sertifikat per proses hapus-terpilih. Anda memilih ${requestedIds.length}. Silakan hapus secara bertahap.`
        },
        { status: 400 }
      );
    }

    const certificatesRef = collection(db, "sertifikat_terbuat");
    let docs = [];

    if (requestedIds.length > 0) {
      // Ambil hanya dokumen yang diminta, di-chunk per 30 id (limit query
      // "in" Firestore), lalu difilter ulang berdasarkan userId sebagai
      // lapisan keamanan tambahan — supaya user tidak bisa menghapus
      // sertifikat milik user lain hanya dengan mengirim id orang lain.
      for (let i = 0; i < requestedIds.length; i += FIRESTORE_IN_CHUNK_SIZE) {
        const chunkIds = requestedIds.slice(i, i + FIRESTORE_IN_CHUNK_SIZE);
        const chunkQuery = query(
          certificatesRef,
          where(documentId(), "in", chunkIds)
        );
        const chunkSnapshot = await getDocs(chunkQuery);
        chunkSnapshot.forEach((docSnap) => {
          if (docSnap.data().userId === uid) docs.push(docSnap);
        });
      }

      if (docs.length === 0) {
        return NextResponse.json({
          deletedCount: 0,
          hasMore: false,
          message: "Sertifikat yang dipilih tidak ditemukan."
        });
      }
    } else {
      // 1. Ambil satu halaman dokumen milik user ini. Query memakai bentuk
      // (where userId + orderBy dibuatPada) yang SAMA dengan GET di atas agar
      // memanfaatkan index composite yang sama, tidak perlu index baru.
      const q = query(
        certificatesRef,
        where("userId", "==", uid),
        orderBy("dibuatPada", "desc"),
        limit(DELETE_BATCH_SIZE)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return NextResponse.json({
          deletedCount: 0,
          hasMore: false,
          message: "Tidak ada sertifikat untuk dihapus."
        });
      }

      docs = querySnapshot.docs;
    }

    const storagePaths = [];

    docs.forEach((docSnap) => {
      const data = docSnap.data();
      const filePath = extractStoragePath(data.urlSertifikat, CERTIFICATE_BUCKET);
      if (filePath) {
        storagePaths.push(filePath);
      } else {
        console.warn(
          `[WARN] Tidak bisa mengekstrak path storage dari URL, dilewati saat hapus file (metadata tetap dihapus): ${data.urlSertifikat}`
        );
      }
    });

    // 2. Hapus file dari Supabase Storage, di-chunk supaya tidak satu
    // panggilan raksasa. Kegagalan hapus file TIDAK menghentikan proses —
    // metadata Firestore tetap dihapus supaya sertifikat hilang dari
    // tampilan user (file yang gagal terhapus dicatat di log untuk
    // ditindaklanjuti manual, bukan jadi alasan menahan penghapusan
    // metadata yang memang diminta user).
    let storageDeleteErrors = 0;
    for (let i = 0; i < storagePaths.length; i += STORAGE_REMOVE_CHUNK_SIZE) {
      const chunk = storagePaths.slice(i, i + STORAGE_REMOVE_CHUNK_SIZE);
      const { error } = await supabase.storage
        .from(CERTIFICATE_BUCKET)
        .remove(chunk);
      if (error) {
        storageDeleteErrors += chunk.length;
        console.error(
          `[ERROR] Gagal menghapus ${chunk.length} file dari Supabase Storage:`,
          error.message
        );
      }
    }

    // 3. Hapus dokumen metadata dari Firestore. docs.length sudah dijamin
    // <= DELETE_BATCH_SIZE (400), jadi aman di bawah limit writeBatch (500).
    const batch = writeBatch(db);
    docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    // PATCH: `hasMore` cuma relevan untuk mode "hapus semua" (paginasi
    // per-halaman). Mode hapus-terpilih selalu memproses seluruh `ids` yang
    // dikirim dalam satu request, jadi hasMore selalu false di mode itu.
    return NextResponse.json({
      deletedCount: docs.length,
      hasMore:
        requestedIds.length === 0 && docs.length === DELETE_BATCH_SIZE,
      storageDeleteErrors: storageDeleteErrors > 0 ? storageDeleteErrors : undefined
    });
  } catch (error) {
    console.error("Error deleting certificates:", error);
    return NextResponse.json(
      { message: "Gagal menghapus sertifikat", error: error.message },
      { status: 500 }
    );
  }
}