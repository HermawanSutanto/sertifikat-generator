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

const GENERATE_CONCURRENCY = 5;
const UPLOAD_CONCURRENCY = 5;

// Cache buffer font TTF mentah untuk resvg-js
const fontBufferCache = new Map();

const fontUrlMap = {
  // Direct link CDN jsDelivr dari repository Google Fonts
  Roboto:
    "https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf",
  Montserrat:
    "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf",
  "Playfair Display":
    "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-normal.ttf",
  Poppins:
    "https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.ttf",
  Lora:
    "https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-700-normal.ttf",
  Pacifico:
    "https://cdn.jsdelivr.net/fontsource/fonts/pacifico@latest/latin-400-normal.ttf",
  Caveat:
    "https://cdn.jsdelivr.net/fontsource/fonts/caveat@latest/latin-700-normal.ttf"
};

async function getFontTtfBuffer(fontFamily) {
  if (fontBufferCache.has(fontFamily)) {
    console.log(`[DEBUG] Font ${fontFamily} diambil dari cache.`);
    return fontBufferCache.get(fontFamily);
  }

  const ttfUrl = fontUrlMap[fontFamily] || fontUrlMap["Roboto"];
  console.log(`[DEBUG] Mencoba mengunduh font: ${fontFamily} dari ${ttfUrl}`);

  try {
    const fontResponse = await fetch(ttfUrl);
    if (!fontResponse.ok) {
      throw new Error(`HTTP ${fontResponse.status}: Gagal mengunduh file font TTF (${fontFamily})`);
    }
    const arrayBuffer = await fontResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // DEBUG: cek magic bytes TTF/OTF (harus mulai dengan 00 01 00 00 atau 'OTTO'/'true')
    const header = buffer.subarray(0, 4).toString("hex");
    console.log(`[DEBUG] Font ${fontFamily} berhasil diunduh (${buffer.length} bytes), header: ${header}`);

    if (buffer.length < 1000) {
      console.warn(`[WARN] Font ${fontFamily} mencurigakan kecil (${buffer.length} bytes) — kemungkinan bukan font valid (misal HTML error page ter-cache sebagai buffer).`);
    }

    fontBufferCache.set(fontFamily, buffer);
    return buffer;
  } catch (error) {
    console.error(`[ERROR] Gagal fetching font ttf (${fontFamily}):`, error.message);
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

// SVG polos TANPA @font-face (resvg akan mencocokkan font dari fontBuffers)
function generateCombinedSvgLayer({ items, imageWidth, imageHeight }) {
  const textNodes = items
    .map(
      ({ text, textColor, fontSize, fontFamily, positionX, positionY }) => `
      <text x="${positionX}" y="${positionY}" text-anchor="middle" dominant-baseline="middle"
        style="fill:${textColor}; font-size:${fontSize}px; font-family:'${fontFamily}';">
        ${sanitizeSvgText(text)}
      </text>`
    )
    .join("\n");

  return `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      ${textNodes}
    </svg>`;
}

function renderTextLayerToPng({ svg, imageWidth, fontBuffers }) {
  console.log(`[DEBUG] Rendering text layer. fontBuffers count: ${fontBuffers.length}`);
  fontBuffers.forEach((buf, i) => {
    console.log(`[DEBUG] fontBuffers[${i}] size: ${buf.length} bytes`);
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: imageWidth },
    font: {
      fontBuffers,           // Menggunakan font TTF dari CDN jsDelivr
      loadSystemFonts: false, // Mematikan font sistem Vercel/Linux
      defaultFontFamily: "Roboto" // Fallback jika font-family tidak terindikasi presisi
    },
    logLevel: "debug" // resvg-js akan print info matching font ke stderr
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  console.log(`[DEBUG] Text layer PNG size: ${pngBuffer.length} bytes, dimensions: ${pngData.width}x${pngData.height}`);

  return pngBuffer;
}

export async function POST(req) {
  try {
    // 1. Autentikasi
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

    // 2. Parsing FormData
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

    // Fetch font TTF mentah untuk dimasukkan ke resvg-js
    const uniqueFontFamilies = [
      ...new Set(textElements.map((el) => el.fontFamily))
    ];
    console.log(`[DEBUG] Font unik yang dibutuhkan:`, uniqueFontFamilies);

    const fontBuffers = (
      await Promise.all(
        uniqueFontFamilies.map((family) => getFontTtfBuffer(family))
      )
    ).filter(Boolean);

    console.log(`[DEBUG] Total font buffers yang berhasil disiapkan: ${fontBuffers.length}/${uniqueFontFamilies.length}`);

    // 4. Proses Generate Gambar secara Dinamis
    const primaryIdentifierLabel =
      textElements.find((el) => el.isLocked)?.label || textElements[0]?.label || "nama";

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

          const pngTextBuffer = renderTextLayerToPng({
            svg,
            imageWidth,
            fontBuffers: fontBuffers || []
          });

          compositeLayers.push({ input: pngTextBuffer, top: 0, left: 0 });
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

    // 5. Upload ke Supabase via supabaseAdmin (Bypass RLS)
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