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
import path from "path";
import fs from "fs";
import admin from "../../../lib/firebaseAdmin";
import { runWithConcurrencyLimit } from "../../../lib/concurrency";

// Batas jumlah proses generate gambar & upload yang berjalan bersamaan.
// Mencegah CPU/memory spike dan rate-limit ketika CSV berisi ratusan baris.
const GENERATE_CONCURRENCY = 5;
const UPLOAD_CONCURRENCY = 5;

// ---------------------------------------------------------------------------
// Font handling
// ---------------------------------------------------------------------------
// RIWAYAT MIGRASI (dari sharp/librsvg -> resvg-js):
// 1. sharp + librsvg + @font-face base64 woff2   -> kadang gagal (tofu box)
// 2. resvg-js + fetch Google Fonts CSS (UA lama) -> unreliable, sering kosong
// 3. resvg-js + fetch Google Fonts Developer API -> masih kosong di production
//    meskipun API key valid & tidak ada error di log (root cause tidak
//    pernah benar-benar terkonfirmasi -- bisa jaringan egress serverless,
//    cold start race condition, dsb).
//
// KEPUTUSAN FINAL: karena daftar font TETAP (cuma 7 pilihan), font di-bundle
// sebagai file .ttf statis langsung di dalam project (public/fonts/) dan
// dibaca dari disk (fs.readFileSync) -- BUKAN fetch dari internet sama
// sekali saat runtime. Ini menghilangkan seluruh kelas masalah yang sudah
// kita temui (API key, restriction, rate limit, endpoint berubah, network
// egress serverless): file-nya sudah pasti ada di server karena ikut
// ter-deploy bersama kode (dijamin oleh `outputFileTracingIncludes` di
// next_config.mjs).
//
// resvg-js (Rust `fontdb`/`ttf-parser`) menerima font sebagai Buffer mentah
// lewat `font.fontBuffers`, dan mencocokkannya ke `font-family` di SVG
// berdasarkan nama family yang tertanam di dalam font itu sendiri -- SVG
// tidak perlu (dan tidak boleh) pakai @font-face sama sekali.
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

// Nama file untuk tiap font yang didukung. Semua sudah di-bundle di
// public/fonts/ (lihat FONTS_DIR di atas) -- tidak ada lagi fetch runtime.
const fontFileMap = {
  Roboto: "Roboto-Bold.ttf",
  Montserrat: "Montserrat-Bold.ttf",
  "Playfair Display": "Playfair-Bold.ttf",
  Poppins: "Poppins-Bold.ttf",
  Lora: "Lora-Bold.ttf",
  Pacifico: "Pacifico-Regular.ttf", // Pacifico cuma punya varian Regular
  Caveat: "Caveat-Bold.ttf"
};

const fontBufferCache = new Map();

function getFontTtfBuffer(fontFamily) {
  if (fontBufferCache.has(fontFamily)) {
    return fontBufferCache.get(fontFamily);
  }

  const fileName = fontFileMap[fontFamily] || fontFileMap["Roboto"];
  
  // Vercel serverless kadang menempatkan root project di process.cwd()
  const filePath = path.join(process.cwd(), "public", "fonts", fileName);

  try {
    if (!fs.existsSync(filePath)) {
      console.error(`[VERCEL DEBUG] File font TIDAK DITEMUKAN di path: ${filePath}`);
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    fontBufferCache.set(fontFamily, buffer);
    return buffer;
  } catch (error) {
    console.error(`Gagal membaca font "${fileName}" di ${filePath}:`, error.message);
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
// Tidak ada @font-face di sini -- resvg-js mencocokkan `font-family` pada
// elemen <text> langsung terhadap buffer font yang didaftarkan lewat opsi
// `font.fontBuffers` saat instance Resvg dibuat.
function generateCombinedSvgLayer({ items, imageWidth, imageHeight }) {
  const textNodes = items
    .map(
      ({ text, textColor, fontSize, fontFamily, positionX, positionY }) => `
      <text 
        x="${positionX}" 
        y="${positionY}" 
        text-anchor="middle" 
        dominant-baseline="central"
        fill="${textColor}"
        font-size="${fontSize}px"
        font-weight="bold"
        font-family="${fontFamily}, Roboto, sans-serif">
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
// sudah dibaca dari disk didaftarkan sebagai fontBuffers.
function renderTextLayerToPng({ svg, imageWidth, fontBuffers }) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: imageWidth },
    font: {
      fontBuffers,
      loadSystemFonts: false,
      // Pastikan defaultFontFamily diset ke "Roboto" (atau nama font utama yang pasti ada di fontBuffers)
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

    // Baca semua font unik dari disk (bukan fetch internet).
    const uniqueFontFamilies = [
      ...new Set(textElements.map((el) => el.fontFamily))
    ];

    // 2. Selalu pastikan "Roboto" masuk ke dalam daftar buffer sebagai FALLBACK
    if (!uniqueFontFamilies.includes("Roboto")) {
      uniqueFontFamilies.push("Roboto");
    }

    // 3. Baca buffer font
    const fontBuffers = uniqueFontFamilies
      .map((fontFamily) => getFontTtfBuffer(fontFamily))
      .filter(Boolean);

    console.log(`[VERCEL LOG] Loaded ${fontBuffers.length} font buffers for families: ${uniqueFontFamilies.join(", ")}`);
    if (fontBuffers.length === 0 && uniqueFontFamilies.length > 0) {
      console.error(
        `PERINGATAN: 0 dari ${uniqueFontFamilies.length} font berhasil dibaca dari public/fonts/ (${uniqueFontFamilies.join(
          ", "
        )}). Semua teks pada sertifikat batch ini TIDAK akan muncul. Cek apakah file ttf ikut ter-deploy.`
      );
    }

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