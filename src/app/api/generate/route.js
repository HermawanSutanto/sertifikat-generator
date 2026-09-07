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
// Karena itu di sini kita fetch varian **ttf** dari Google Fonts (bukan
// woff2), dengan memaksa Google Fonts mengirim ttf lewat User-Agent lama
// yang tidak mendukung woff/woff2.
const fontBufferCache = new Map();

const fontFamilyMap = {
  Roboto: "Roboto",
  Montserrat: "Montserrat",
  "Playfair Display": "Playfair+Display",
  Poppins: "Poppins",
  Lora: "Lora",
  Pacifico: "Pacifico",
  Caveat: "Caveat"
};

// User-Agent lama (tanpa dukungan woff/woff2) membuat Google Fonts CSS API
// mengembalikan url font dalam format .ttf, bukan .woff2.
const LEGACY_UA =
  "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)";

async function getFontTtfBuffer(fontFamily) {
  if (fontBufferCache.has(fontFamily)) {
    return fontBufferCache.get(fontFamily);
  }

  const googleFamily = fontFamilyMap[fontFamily] || fontFamilyMap["Roboto"];
  const cssUrl = `https://fonts.googleapis.com/css?family=${googleFamily}:700&display=swap`;

  try {
    // 1. Ambil CSS dengan UA lama supaya Google mengirim link .ttf
    const cssResponse = await fetch(cssUrl, {
      headers: { "User-Agent": LEGACY_UA }
    });
    if (!cssResponse.ok) {
      throw new Error(`Gagal mengambil CSS font: ${fontFamily}`);
    }
    const cssText = await cssResponse.text();

    // 2. Ekstrak URL font (.ttf) dari CSS
    const match = cssText.match(/url\((https:[^)]+\.ttf)\)/);
    if (!match) {
      throw new Error(
        `Tidak menemukan URL .ttf untuk font ${fontFamily}. Google mungkin mengubah format respons.`
      );
    }
    const ttfUrl = match[1];

    // 3. Unduh file .ttf sebagai Buffer
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