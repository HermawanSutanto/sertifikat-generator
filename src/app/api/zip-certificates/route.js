// src/app/api/zip-certificates/route.js

import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";
import { db } from "../../../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  documentId
} from "firebase/firestore";
import { supabaseAdmin as supabase } from "../../../lib/supabaseAdmin";
import JSZip from "jszip";
import { runWithConcurrencyLimit } from "../../../lib/concurrency";

// Batas jumlah download paralel dari Supabase Storage, dan batas jumlah
// sertifikat per permintaan ZIP agar request tidak timeout / OOM saat
// pengguna sudah memiliki ratusan/ribuan sertifikat.
const DOWNLOAD_CONCURRENCY = 5;
const MAX_CERTIFICATES_PER_ZIP = 300;

// Firestore "in" query hanya mendukung maksimum 30 nilai per query,
// jadi permintaan ZIP untuk sertifikat terpilih (ids) di-chunk per 30 id.
const FIRESTORE_IN_CHUNK_SIZE = 30;

export async function POST(req) {
  try {
    // 1. Autentikasi Pengguna (Sama seperti endpoint generate)
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Token tidak valid" },
        { status: 401 }
      );
    }
    const idToken = authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (!uid) {
      return NextResponse.json(
        { message: "UID tidak ditemukan" },
        { status: 403 }
      );
    }

    // 2. Ambil Data Sertifikat Pengguna dari Firestore
    // PATCH: dashboard sekarang bisa mengirim daftar `ids` (hasil checklist
    // pilih-sertifikat) di body JSON untuk mengompres HANYA sertifikat yang
    // dipilih user, bukan selalu 300 sertifikat terbaru. Kalau body kosong /
    // tidak ada `ids`, perilaku lama dipertahankan (ambil paling banyak
    // MAX_CERTIFICATES_PER_ZIP sertifikat terbaru).
    let requestedIds = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) requestedIds = body.ids;
    } catch {
      // Body kosong/bukan JSON valid -> anggap tidak ada seleksi, pakai default.
    }

    if (requestedIds.length > MAX_CERTIFICATES_PER_ZIP) {
      return NextResponse.json(
        {
          message: `Maksimum ${MAX_CERTIFICATES_PER_ZIP} sertifikat per proses kompres. Anda memilih ${requestedIds.length}. Silakan kompres secara bertahap.`
        },
        { status: 400 }
      );
    }

    const certificatesRef = collection(db, "sertifikat_terbuat");
    let certificateData = [];

    if (requestedIds.length > 0) {
      // Ambil hanya dokumen yang diminta, di-chunk per 30 id (limit query "in"
      // Firestore), lalu difilter ulang berdasarkan userId sebagai lapisan
      // keamanan tambahan supaya user tidak bisa mengompres sertifikat
      // milik user lain hanya dengan menebak/mengirim id orang lain.
      for (let i = 0; i < requestedIds.length; i += FIRESTORE_IN_CHUNK_SIZE) {
        const chunkIds = requestedIds.slice(i, i + FIRESTORE_IN_CHUNK_SIZE);
        const chunkQuery = query(
          certificatesRef,
          where(documentId(), "in", chunkIds)
        );
        const chunkSnapshot = await getDocs(chunkQuery);
        chunkSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.userId === uid) certificateData.push(data);
        });
      }

      if (certificateData.length === 0) {
        return NextResponse.json(
          { message: "Sertifikat yang dipilih tidak ditemukan." },
          { status: 404 }
        );
      }
    } else {
      const q = query(
        certificatesRef,
        where("userId", "==", uid),
        orderBy("dibuatPada", "desc"),
        limit(MAX_CERTIFICATES_PER_ZIP)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return NextResponse.json(
          { message: "Tidak ada sertifikat untuk di-ZIP" },
          { status: 404 }
        );
      }

      certificateData = querySnapshot.docs.map((doc) => doc.data());
    }

    // 3. Unduh File dari Supabase & Buat ZIP di Memori Server.
    // Download dibatasi concurrency-nya (bukan Promise.all polos) supaya
    // tidak membuka ratusan koneksi download sekaligus dan membebani memori
    // dengan menyimpan semua arrayBuffer di RAM secara bersamaan.
    const zip = new JSZip();
    const skippedCertificates = [];

    // Ekstrak path file relatif terhadap bucket dari sebuah Supabase Storage
    // public URL. Menangani baik pola "/object/public/<bucket>/<path>"
    // maupun "/object/sign/<bucket>/<path>", bukan hanya string match polos
    // ke nama bucket (yang gagal diam-diam kalau format URL berbeda).
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

    await runWithConcurrencyLimit(
      certificateData,
      DOWNLOAD_CONCURRENCY,
      async (cert) => {
        const filePath = extractStoragePath(
          cert.urlSertifikat,
          "generated-certificates"
        );

        if (!filePath) {
          console.error(
            `Tidak bisa mengekstrak path dari URL: ${cert.urlSertifikat}`
          );
          skippedCertificates.push(cert.namaPeserta);
          return; // Lewati file yang URL-nya tidak dikenali
        }

        const { data, error } = await supabase.storage
          .from("generated-certificates")
          .download(filePath);

        if (error) {
          console.error(`Gagal mengunduh file ${filePath}:`, error);
          skippedCertificates.push(cert.namaPeserta);
          return; // Lewati file yang gagal
        }

        // PATCH: file yang digenerate di /api/generate adalah JPEG, bukan PNG
        // — nama file di ZIP sebelumnya salah pakai ekstensi .png.
        const fileName = `sertifikat-${cert.namaPeserta.replace(
          /\s+/g,
          "-"
        )}.jpeg`;
        zip.file(fileName, await data.arrayBuffer());
      }
    );

    if (Object.keys(zip.files).length === 0) {
      return NextResponse.json(
        {
          message:
            "Semua file sertifikat gagal diunduh, ZIP tidak dapat dibuat."
        },
        { status: 500 }
      );
    }

    // 4. Generate Buffer ZIP dan Unggah ke Supabase
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const zipPath = `arsip-zip/sertifikat-${uid}-${Date.now()}.zip`;
    const { error: uploadError } = await supabase.storage
      .from("generated-certificates") // Atau bucket lain jika Anda mau
      .upload(zipPath, zipBuffer, {
        contentType: "application/zip"
      });

    if (uploadError) {
      throw new Error("Gagal mengunggah file ZIP ke storage.");
    }

    // 5. Dapatkan URL Publik untuk File ZIP
    const {
      data: { publicUrl }
    } = supabase.storage.from("generated-certificates").getPublicUrl(zipPath);

    // 6. Kirim URL ZIP kembali ke Client, sertakan info jika ada sertifikat
    // yang terlewat agar pengguna tahu ZIP tidak lengkap (bukan gagal diam-diam).
    // PATCH: beri tahu client kalau proses ini memakai mode default (bukan
    // seleksi manual) DAN jumlah sertifikat user kemungkinan lebih banyak
    // dari MAX_CERTIFICATES_PER_ZIP, supaya dashboard bisa menampilkan alert
    // "hanya N terbaru yang ter-ZIP" alih-alih diam-diam memotong sisanya.
    const possiblyTruncated =
      requestedIds.length === 0 &&
      certificateData.length === MAX_CERTIFICATES_PER_ZIP;

    return NextResponse.json({
      zipUrl: publicUrl,
      zippedCount: certificateData.length,
      maxPerZip: MAX_CERTIFICATES_PER_ZIP,
      possiblyTruncated,
      skippedCount: skippedCertificates.length,
      skippedNames:
        skippedCertificates.length > 0 ? skippedCertificates : undefined
    });
  } catch (error) {
    console.error("Kesalahan saat membuat file ZIP:", error);
    return NextResponse.json(
      { message: error.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}