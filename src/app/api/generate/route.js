import { supabaseAdmin as supabase } from "../../../lib/supabaseAdmin";
import { db } from "../../../lib/firebase";
import {
  collection,
  serverTimestamp,
  writeBatch,
  doc
} from "firebase/firestore";
import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";
import { runWithConcurrencyLimit } from "../../../lib/concurrency";

// Batas jumlah proses generate gambar & upload yang berjalan bersamaan.
// Mencegah CPU/memory spike dan rate-limit ketika CSV berisi ratusan baris.
const GENERATE_CONCURRENCY = 5;
const UPLOAD_CONCURRENCY = 5;

// ---------------------------------------------------------------------------
// Font handling
// ---------------------------------------------------------------------------
// PENTING: resvg-js (berbasis Rust `fontdb`/`ttf-parser`) tidak mendukung
// woff2 dengan baik, dan TIDAK membaca font lewat CSS @font-face di dalam
// SVG sama sekali (berbeda dari librsvg yang dipakai sharp sebelumnya).
// Font harus didaftarkan sebagai Buffer TTF/OTF mentah lewat opsi
// `font.fontBuffers` saat membuat instance Resvg, dan SVG cukup mereferensi
// nama font-family biasa tanpa @font-face.
//
// CATATAN MIGRASI: percobaan pertama memakai trik "User-Agent lama" ke
// endpoint fonts.googleapis.com/css supaya Google mengirim .ttf alih-alih
// .woff2. Trik itu TIDAK reliable -- Google mengubah/mengetatkan deteksi UA
// di endpoint CSS tsb, sehingga kadang berhasil di lokal (browser/DNS cache
// lama) tapi gagal saat request fresh dari server produksi.
//
// Solusi yang dipakai di sini: Google Fonts DEVELOPER API resmi
// (https://developers.google.com/fonts/docs/developer_api), bukan endpoint
// CSS yang men-sniff User-Agent. Field `files` di API ini SELALU berisi URL
// .ttf statis secara default (didokumentasikan resmi oleh Google, tidak
// bergantung User-Agent). Butuh API key gratis dari Google Cloud Console
// (aktifkan "Google Fonts Developer API"), disimpan di env var
// GOOGLE_FONTS_API_KEY.
const fontBufferCache = new Map();

const GOOGLE_FONTS_API_KEY = process.env.GOOGLE_FONTS_API_KEY;

// Query metadata untuk satu family lewat Google Fonts Developer API resmi,
// lalu ambil URL file .ttf-nya dari field `files`.
async function fetchFontFileUrl(fontFamily) {
  const url = `https://www.googleapis.com/webfonts/v1/webfonts?family=${encodeURIComponent(
    fontFamily
  )}&key=${GOOGLE_FONTS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Fonts API error (${fontFamily}): ${res.status}`);
  }
  const data = await res.json();
  const item = data.items && data.items[0];
  if (!item) {
    throw new Error(`Font "${fontFamily}" tidak ditemukan di Google Fonts.`);
  }
  // Pilih varian bold (700) kalau ada, jatuh ke regular kalau tidak.
  const fileUrl = item.files["700"] || item.files.regular || item.menu;
  if (!fileUrl) {
    throw new Error(`Tidak ada file .ttf untuk font "${fontFamily}".`);
  }
  // API kadang mengembalikan http://, upgrade ke https:// untuk fetch aman.
  return fileUrl.replace(/^http:\/\//, "https://");
}

async function getFontTtfBuffer(fontFamily) {
  if (fontBufferCache.has(fontFamily)) {
    return fontBufferCache.get(fontFamily);
  }

  try {
    if (!GOOGLE_FONTS_API_KEY) {
      throw new Error(
        "GOOGLE_FONTS_API_KEY belum diset di environment variables."
      );
    }

    const ttfUrl = await fetchFontFileUrl(fontFamily);

    const fontResponse = await fetch(ttfUrl);
    if (!fontResponse.ok) {
      throw new Error(`Gagal mengunduh file font: ${fontFamily}`);
    }
    const arrayBuffer = await fontResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fontBufferCache.set(fontFamily, buffer);
    return buffer;
  } catch (error) {
    console.error("Error fetching font ttf:", error);
    return null;
  }
}

function sanitizeSvgText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Membuat SATU layer SVG yang berisi semua elemen teks untuk sebuah sertifikat.
// Tidak ada lagi @font-face di sini -- resvg-js mencocokkan `font-family`
// pada elemen <text> langsung terhadap buffer font yang didaftarkan lewat
// opsi `font.fontBuffers` saat instance Resvg dibuat.
function generateCombinedSvgLayer({ items, imageWidth, imageHeight }) {
  const textNodes = items
    .map(
      ({ text, textColor, fontSize, fontFamily, positionX, positionY }) => `
      <text x="${positionX}" y="${positionY}" text-anchor="middle" dominant-baseline="middle"
        style="fill:${textColor}; font-size:${fontSize}px; font-weight:bold; font-family:'${fontFamily}', sans-serif;">
        ${sanitizeSvgText(text)}
      </text>`
    )
    .join("\n");

  const svg = `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      ${textNodes}
    </svg>`;
  return svg;
}

// Merender SVG teks menjadi PNG buffer lewat resvg-js, dengan font yang
// sudah diambil dari internet didaftarkan sebagai fontBuffers.
function renderTextLayerToPng({ svg, imageWidth, imageHeight, fontBuffers }) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: imageWidth },
    font: {
      fontBuffers,
      loadSystemFonts: false, // konsisten di semua environment/server
      defaultFontFamily: "Roboto"
    }
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function POST(req) {
  try {
    // 1. Autentikasi (Tidak ada perubahan)
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Token tidak ditemukan" },
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

    // 2. Parsing FormData dengan data terstruktur baru
    const formData = await req.formData();
    const templateFile = formData.get("template");
    const previewWidth = parseInt(formData.get("previewWidth"), 10) || 500;

    const textElementsRaw = formData.get("textElements");
    const csvDataRaw = formData.get("csvData");
    const mappingRaw = formData.get("mapping");

    if (!templateFile || !textElementsRaw || !csvDataRaw || !mappingRaw) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    let textElements, csvData, mapping;
    try {
      textElements = JSON.parse(textElementsRaw);
      csvData = JSON.parse(csvDataRaw);
      mapping = JSON.parse(mappingRaw);
    } catch (parseError) {
      return NextResponse.json(
        { message: "Format data tidak valid (gagal mem-parsing JSON)." },
        { status: 400 }
      );
    }

    if (!Array.isArray(textElements) || textElements.length === 0) {
      return NextResponse.json(
        { message: "Elemen teks sertifikat tidak boleh kosong." },
        { status: 400 }
      );
    }
    if (!Array.isArray(csvData) || csvData.length === 0) {
      return NextResponse.json(
        { message: "Data CSV tidak boleh kosong." },
        { status: 400 }
      );
    }

    const isManualMode = Object.keys(mapping).length === 0;

    // 3. Persiapan Gambar Template
    let templateFileBuffer = Buffer.from(await templateFile.arrayBuffer());
    const maxSizeInBytes = 2 * 1024 * 1024;
    if (templateFileBuffer.length > maxSizeInBytes) {
      templateFileBuffer = await sharp(templateFileBuffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const baseImage = sharp(templateFileBuffer);
    const metadata = await baseImage.metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    const scaleFactor = imageWidth / previewWidth;

    // Ambil semua font unik sebagai Buffer TTF dari internet, paralel & di-cache.
    const uniqueFontFamilies = [
      ...new Set(textElements.map((el) => el.fontFamily))
    ];
    const fontBufferEntries = await Promise.all(
      uniqueFontFamilies.map(async (fontFamily) => [
        fontFamily,
        await getFontTtfBuffer(fontFamily)
      ])
    );
    // fontBuffers untuk resvg-js: cukup array Buffer, cocokkan berdasarkan
    // nama family yang tersimpan di dalam file font itu sendiri.
    const fontBuffers = fontBufferEntries
      .map(([, buf]) => buf)
      .filter(Boolean);

    // 4. Proses Generate Gambar secara Dinamis
    const primaryIdentifierLabel =
      textElements.find((el) => el.isLocked)?.label || textElements[0].label;

    const allGeneratedData = await runWithConcurrencyLimit(
      csvData,
      GENERATE_CONCURRENCY,
      async (row) => {
        const primaryIdentifier = isManualMode
          ? row[primaryIdentifierLabel]
          : row[mapping[primaryIdentifierLabel]] || `sertifikat-${Date.now()}`;

        const svgItems = [];
        for (const element of textElements) {
          const text = isManualMode
            ? row[element.label]
            : row[mapping[element.label]];

          if (!text) continue;

          svgItems.push({
            text,
            textColor: element.textColor,
            fontSize: Math.round(element.fontSize * scaleFactor),
            fontFamily: element.fontFamily,
            positionX: imageWidth * element.positionPercent.x,
            positionY: imageHeight * element.positionPercent.y
          });
        }

        const compositeLayers = [];
        if (svgItems.length) {
          const svg = generateCombinedSvgLayer({
            items: svgItems,
            imageWidth,
            imageHeight
          });
          const pngBuffer = renderTextLayerToPng({
            svg,
            imageWidth,
            imageHeight,
            fontBuffers
          });
          compositeLayers.push({ input: pngBuffer, top: 0, left: 0 });
        }

        const generatedCertBuffer = await baseImage
          .clone()
          .composite(compositeLayers)
          .jpeg({ quality: 85 })
          .toBuffer();

        return {
          name: primaryIdentifier,
          buffer: generatedCertBuffer,
          rowData: row
        };
      }
    );

    // 5. Upload ke Supabase
    const allUploadedCerts = await runWithConcurrencyLimit(
      allGeneratedData,
      UPLOAD_CONCURRENCY,
      async (data) => {
        const certPath = `sertifikat-${String(data.name).replace(
          /\s+/g,
          "-"
        )}-${Date.now()}.jpeg`;
        const { error: uploadError } = await supabase.storage
          .from("generated-certificates")
          .upload(certPath, data.buffer, { contentType: "image/jpeg" });

        if (uploadError) {
          console.error(`Gagal upload sertifikat ${data.name}:`, uploadError);
          return null;
        }

        const {
          data: { publicUrl }
        } = supabase.storage
          .from("generated-certificates")
          .getPublicUrl(certPath);
        return { name: data.name, url: publicUrl, rowData: data.rowData };
      }
    ).then((results) => results.filter(Boolean));

    // 6. Simpan Metadata ke Firestore
    const batch = writeBatch(db);
    allUploadedCerts.forEach((cert) => {
      const docRef = doc(collection(db, "sertifikat_terbuat"));
      batch.set(docRef, {
        userId: uid,
        namaPeserta: cert.name,
        urlSertifikat: cert.url,
        dibuatPada: serverTimestamp(),
        csvData: cert.rowData,
        templateCustomization: textElements
      });
    });
    await batch.commit();

    // 7. Kirim Response Sukses
    return NextResponse.json({
      certificateUrls: allUploadedCerts.map((cert) => cert.url)
    });
  } catch (error) {
    console.error("Kesalahan di API generate:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}