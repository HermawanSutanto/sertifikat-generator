import { supabaseAdmin as supabase } from "../../../lib/supabaseAdmin";
import { db } from "../../../lib/firebase";
import {
  collection,
  serverTimestamp,
  writeBatch,
  doc
} from "firebase/firestore";
import sharp from "sharp";
import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";
import { runWithConcurrencyLimit } from "../../../lib/concurrency";

// Batas jumlah proses generate gambar & upload yang berjalan bersamaan.
const GENERATE_CONCURRENCY = 5;
const UPLOAD_CONCURRENCY = 5;

// Helper function untuk mengambil dan cache font
const fontCache = new Map();
async function getFontBase64(fontFamily) {
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily);
  }
  const fontUrlMap = {
    Roboto:
      "https://fonts.gstatic.com/s/roboto/v49/KFO5CnqEu92Fr1Mu53ZEC9_Vu3r1gIhOszmkC3kaWzU.woff2",
    Montserrat:
      "https://fonts.gstatic.com/s/montserrat/v31/JTUQjIg1_i6t8kCHKm459WxRxC7mw9c.woff2",
    "Playfair Display":
      "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFkD-vYSZviVYUb_rj3ij__anPXDTnohkk72xU.woff2",
    Poppins:
      "https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJbecmNE.woff2",
    Lora: "https://fonts.gstatic.com/s/lora/v37/0QIhMX1D_JOuMw_LLPtLp_A.woff2",
    Pacifico:
      "https://fonts.gstatic.com/s/pacifico/v23/FwZY7-Qmy14u9lezJ-6K6MmTpA.woff2",
    Caveat:
      "https://fonts.gstatic.com/s/caveat/v23/Wnz6HAc5bAfYB2Q7azYYmg8.woff2"
  };
  const fontUrl = fontUrlMap[fontFamily] || fontUrlMap["Roboto"];
  try {
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error(`Gagal mengambil font: ${fontFamily}`);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    fontCache.set(fontFamily, base64);
    return base64;
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

// Membuat SATU layer SVG yang berisi semua elemen teks untuk sebuah sertifikat
function generateCombinedSvgLayer({ items, imageWidth, imageHeight }) {
  const uniqueFonts = [...new Set(items.map((i) => i.fontFamily))];
  const fontFaces = uniqueFonts
    .map(
      (fontFamily) => `
        @font-face {
          font-family: "${fontFamily}";
          src: url(data:font/woff2;base64,${
            items.find((i) => i.fontFamily === fontFamily).fontBase64
          });
        }`
    )
    .join("\n");

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
      <style>${fontFaces}</style>
      ${textNodes}
    </svg>`;
  return Buffer.from(svg);
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

    // 3. Persiapan Gambar Template dan Font
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

    // Cache semua font yang dibutuhkan secara paralel
    const uniqueFontFamilies = [
      ...new Set(textElements.map((el) => el.fontFamily))
    ];
    await Promise.all(
      uniqueFontFamilies.map((fontFamily) => getFontBase64(fontFamily))
    );

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

          const fontBase64 = fontCache.get(element.fontFamily);
          if (!fontBase64) {
            console.error(
              `ERROR: Font base64 untuk ${element.fontFamily} tidak ditemukan di cache. Mengabaikan layer.`
            );
            continue;
          }

          svgItems.push({
            text,
            textColor: element.textColor,
            fontSize: Math.round(element.fontSize * scaleFactor),
            fontFamily: element.fontFamily,
            fontBase64,
            positionX: imageWidth * element.positionPercent.x,
            positionY: imageHeight * element.positionPercent.y
          });
        }

        const compositeLayers = svgItems.length
          ? [
              {
                input: generateCombinedSvgLayer({
                  items: svgItems,
                  imageWidth,
                  imageHeight
                }),
                top: 0,
                left: 0
              }
            ]
          : [];

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

    // 5. Upload ke Supabase (menggunakan supabaseAdmin agar bypass RLS)
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