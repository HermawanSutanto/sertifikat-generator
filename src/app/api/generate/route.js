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

// Paksa route ini jalan di Node.js runtime (bukan Edge). Wajib untuk
// package native seperti sharp & @resvg/resvg-js yang butuh binary .node -
// binary itu tidak bisa jalan di Edge runtime sama sekali.
export const runtime = "nodejs";

// @resvg/resvg-js memuat binary native (.node) lewat js-binding.js.
// Turbopack mencoba membundel semua import ke dalam chunk ESM, dan gagal
// karena binary .node bukan asset yang bisa "ditaruh" ke module id ESM
// (-> error "non-ecmascript placeable asset"). Menandai package ini
// sebagai external membuat Next.js cukup me-require-nya langsung saat
// runtime, bukan mencoba membundelnya. Lihat next.config.js.


// Batas jumlah proses generate gambar & upload yang berjalan bersamaan.
// Mencegah CPU/memory spike dan rate-limit ketika CSV berisi ratusan baris.
const GENERATE_CONCURRENCY = 5;
const UPLOAD_CONCURRENCY = 5;

// Helper function untuk mengambil dan cache font.
// CATATAN #1: sebelumnya font di-encode ke base64 dan disisipkan lewat CSS
// @font-face di dalam SVG, lalu SVG itu dirender langsung oleh sharp
// (yang di baliknya memakai librsvg). librsvg TIDAK mendukung @font-face
// dengan data URI - ia hanya mengenali font yang benar-benar terpasang di
// sistem (via fontconfig). Karena server (terutama serverless) umumnya
// tidak punya font-font ini terpasang, hasilnya teks dirender sebagai
// kotak "tofu" (glyph pengganti), bukan huruf sungguhan.
//
// CATATAN #2: setelah pindah ke resvg (yang membaca font lewat
// `font.fontBuffers`), ternyata teks malah hilang total, bukan tofu lagi.
// Penyebabnya: font di atas diambil dalam format .woff2 (font terkompresi
// Brotli), dan fontdb yang dipakai resvg tidak bisa mem-parsing .woff2.
// Karena `loadSystemFonts: false` (lihat renderSvgToPngBuffer), tidak ada
// fallback font sama sekali begitu font utama gagal dimuat - hasilnya teks
// dirender kosong tanpa error.
//
// Fix: ambil font dalam format .ttf, bukan .woff2. Google Fonts API v1
// (fonts.googleapis.com/css) mendeteksi User-Agent request - kalau kita
// menyamar sebagai browser lama yang belum mendukung WOFF2, Google akan
// mengembalikan CSS yang linknya mengarah ke file .ttf, bukan .woff2.
const fontCache = new Map();
const ttfUrlCache = new Map();

async function resolveGoogleFontTtfUrl(fontFamily) {
  if (ttfUrlCache.has(fontFamily)) return ttfUrlCache.get(fontFamily);

  const familyParam = encodeURIComponent(fontFamily).replace(/%20/g, "+");
  const cssUrl = `https://fonts.googleapis.com/css?family=${familyParam}`;

  try {
    const res = await fetch(cssUrl, {
      headers: {
        // User-Agent browser lama (tidak dukung WOFF2) supaya Google Fonts
        // mengembalikan URL .ttf di dalam CSS-nya.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1"
      }
    });
    if (!res.ok) throw new Error(`Gagal resolve font ${fontFamily} (${res.status})`);
    const css = await res.text();
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
    const ttfUrl = match ? match[1] : null;
    if (!ttfUrl) {
      throw new Error(`Tidak menemukan URL .ttf untuk font ${fontFamily}`);
    }
    ttfUrlCache.set(fontFamily, ttfUrl);
    return ttfUrl;
  } catch (error) {
    console.error("Error resolving Google Font TTF URL:", error);
    return null;
  }
}

async function getFontBuffer(fontFamily) {
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily);
  }
  try {
    const ttfUrl = await resolveGoogleFontTtfUrl(fontFamily);
    if (!ttfUrl) return null;
    const response = await fetch(ttfUrl);
    if (!response.ok) throw new Error(`Gagal mengambil font: ${fontFamily}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fontCache.set(fontFamily, buffer);
    return buffer;
  } catch (error) {
    console.error("Error fetching font:", error);
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

// Membuat SATU markup SVG yang berisi semua elemen teks untuk sebuah
// sertifikat, alih-alih satu SVG terpisah per elemen teks. Ini menghindari
// N kali parsing/render SVG per sertifikat (sekarang cukup 1 kali render
// lewat resvg - lihat pemanggil fungsi ini).
//
// Tidak ada lagi @font-face di sini: font diserahkan ke resvg sebagai
// Buffer lewat opsi `font.fontBuffers` pada saat render, resvg mencocokkan
// font-family di bawah ini dengan nama font yang ada di dalam file font
// tersebut (dibaca dari metadata font, bukan dari @font-face).
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

  return `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      ${textNodes}
    </svg>`;
}

// Merender markup SVG (elemen <text> saja, tanpa @font-face) menjadi PNG
// buffer memakai resvg, dengan font-font yang dibutuhkan diberikan langsung
// sebagai Buffer. Ini menggantikan pendekatan lama (SVG di-composite
// langsung oleh sharp/librsvg) yang gagal merender font ter-embed.
function renderSvgToPngBuffer({ svgMarkup, fontBuffers }) {
  const resvg = new Resvg(svgMarkup, {
    font: {
      fontBuffers,
      // Font yang dibutuhkan sudah kita berikan manual lewat fontBuffers,
      // jadi tidak perlu resvg memindai font sistem - lebih cepat dan
      // hasilnya konsisten di environment apa pun (termasuk serverless
      // yang tidak punya font-font ini terpasang).
      loadSystemFonts: false
    },
    // Latar transparan supaya saat di-composite ke atas gambar template
    // oleh sharp, hanya teksnya saja yang menimpa, bukan kotak solid.
    background: "rgba(255, 255, 255, 0)"
  });
  return resvg.render().asPng();
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

    // Validasi field wajib SEBELUM mem-parsing JSON, agar pesan error yang
    // dikembalikan jelas ("Data tidak lengkap") alih-alih generic parsing
    // error ("Unexpected token ... in JSON") saat salah satu field lupa
    // dikirim oleh client.
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
      csvData = JSON.parse(csvDataRaw); // Ini adalah `dataToSend` dari frontend
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

    // 3. Persiapan Gambar Template dan Font
    let templateFileBuffer = Buffer.from(await templateFile.arrayBuffer());
    const maxSizeInBytes = 2 * 1024 * 1024;
    if (templateFileBuffer.length > maxSizeInBytes) {
      templateFileBuffer = await sharp(templateFileBuffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Satu instance sharp dipakai untuk membaca metadata sekaligus sebagai
    // basis composite (sebelumnya sharp() dipanggil 2x untuk buffer yang sama).
    const baseImage = sharp(templateFileBuffer);
    const metadata = await baseImage.metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    const scaleFactor = imageWidth / previewWidth;

    // Cache semua font yang dibutuhkan secara paralel untuk efisiensi
    const uniqueFontFamilies = [
      ...new Set(textElements.map((el) => el.fontFamily))
    ];
    await Promise.all(
      uniqueFontFamilies.map((fontFamily) => getFontBuffer(fontFamily))
    );

    // 4. Proses Generate Gambar secara Dinamis
    // primaryIdentifierLabel konstan untuk semua baris CSV, jadi dihitung
    // sekali di sini alih-alih diulang pada setiap iterasi row.
    const primaryIdentifierLabel =
      textElements.find((el) => el.isLocked)?.label || textElements[0].label;

    // Dibatasi dengan concurrency limit (bukan Promise.all polos) agar CSV
    // berisi ratusan/ribuan baris tidak memicu ratusan operasi sharp composite
    // berjalan bersamaan (risiko OOM & timeout di serverless).
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

          const fontBuffer = fontCache.get(element.fontFamily);
          if (!fontBuffer) {
            console.error(
              `ERROR: Font buffer for ${element.fontFamily} not found in cache. Skipping layer.`
            );
            continue;
          }

          svgItems.push({
            text,
            textColor: element.textColor,
            fontSize: Math.round(element.fontSize * scaleFactor),
            fontFamily: element.fontFamily,
            positionX: imageWidth * element.positionPercent.x,
            positionY: imageHeight * element.positionPercent.y
          });
        }

        // Satu layer teks gabungan per sertifikat, dirender ke PNG via resvg
        // (bukan diserahkan mentah-mentah sebagai SVG ke sharp/librsvg),
        // lalu di-composite ke atas template seperti biasa.
        let compositeLayers = [];
        if (svgItems.length) {
          const fontsUsed = [...new Set(svgItems.map((i) => i.fontFamily))];
          const fontBuffers = fontsUsed
            .map((fontFamily) => fontCache.get(fontFamily))
            .filter(Boolean);

          const svgMarkup = generateCombinedSvgLayer({
            items: svgItems,
            imageWidth,
            imageHeight
          });

          const pngBuffer = renderSvgToPngBuffer({ svgMarkup, fontBuffers });
          compositeLayers = [{ input: pngBuffer, top: 0, left: 0 }];
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

    // 5. Upload ke Supabase, juga dibatasi concurrency-nya agar tidak
    // membuka ratusan koneksi upload paralel sekaligus.
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

    // 6. Simpan Metadata yang lebih terstruktur ke Firestore
    const batch = writeBatch(db);
    allUploadedCerts.forEach((cert) => {
      const docRef = doc(collection(db, "sertifikat_terbuat"));
      batch.set(docRef, {
        userId: uid,
        namaPeserta: cert.name,
        urlSertifikat: cert.url,
        dibuatPada: serverTimestamp(),
        csvData: cert.rowData,
        templateCustomization: textElements // Simpan seluruh konfigurasi elemen
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