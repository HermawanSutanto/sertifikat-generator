import { supabase } from "../../../lib/supabase";
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

// Helper function untuk mengambil dan cache font
const fontCache = new Map();
async function getFontBase64(fontFamily) {
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily);
  }
  const fontUrlMap = {
    Roboto: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf",
    Montserrat:
      "https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.ttf",
    "Playfair Display":
      "https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWos7joP-pg.ttf",
    Poppins:
      "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrJ-FnVw.ttf",
    Lora: "https://fonts.gstatic.com/s/lora/v26/0QI6MX1D_JOuGQREALo.ttf",
    Pacifico:
      "https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ-6H6MmBp0u-zK4.ttf",
    Caveat: "https://fonts.gstatic.com/s/caveat/v17/WnznHAc5bAfYB2Q7azg.ttf"
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

// Helper function untuk membuat layer SVG
function generateSvgLayer({
  text,
  textColor,
  fontSize,
  fontFamily,
  fontBase64,
  positionX,
  positionY,
  imageWidth,
  imageHeight
}) {
  // Ganti karakter khusus HTML agar tidak merusak SVG
  const sanitizedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const svgText = `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <style>
        @font-face {
          font-family: "${fontFamily}";
          src: url(data:font/ttf;base64,${fontBase64});
        }
        .title {
          fill: ${textColor};
          font-size: ${fontSize}px;
          font-weight: bold;
          font-family: "${fontFamily}", sans-serif;
        }
      </style>
      <text x="${positionX}" y="${positionY}" text-anchor="middle" dominant-baseline="middle" class="title">${sanitizedText}</text>
    </svg>`;
  return Buffer.from(svgText);
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

    // 2. Parsing FormData dengan data terstruktur
    const formData = await req.formData();
    const templateFile = formData.get("template");
    const previewWidth = parseInt(formData.get("previewWidth"), 10) || 500;

    const textElements = JSON.parse(formData.get("textElements"));
    const csvData = JSON.parse(formData.get("csvData"));
    const mapping = JSON.parse(formData.get("mapping"));

    if (!templateFile || !textElements || !csvData || !mapping) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // 3. Persiapan Gambar Template dan Font
    let templateFileBuffer = Buffer.from(await templateFile.arrayBuffer());
    const maxSizeInBytes = 2 * 1024 * 1024;
    if (templateFileBuffer.length > maxSizeInBytes) {
      templateFileBuffer = await sharp(templateFileBuffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const metadata = await sharp(templateFileBuffer).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    const baseImage = sharp(templateFileBuffer);
    const scaleFactor = imageWidth / previewWidth;

    // Cache semua font yang dibutuhkan secara paralel
    const uniqueFontFamilies = [
      ...new Set(textElements.map((el) => el.fontFamily))
    ];
    await Promise.all(
      uniqueFontFamilies.map((fontFamily) => getFontBase64(fontFamily))
    );

    // 4. Proses Generate Gambar secara Paralel (Logika Inti yang Dinamis)
    const generatedDataPromises = csvData.map(async (row) => {
      const compositeLayers = [];
      const primaryIdentifier =
        row[Object.values(mapping)[0]] || `sertifikat-${Date.now()}`;

      for (const element of textElements) {
        const mappedHeader = mapping[element.label];
        const text = row[mappedHeader];

        if (text) {
          const fontBase64 = fontCache.get(element.fontFamily);
          const layer = generateSvgLayer({
            text: String(text),
            textColor: element.textColor,
            fontSize: Math.round(element.fontSize * scaleFactor),
            fontFamily: element.fontFamily,
            fontBase64: fontBase64,
            positionX: imageWidth * element.positionPercent.x,
            positionY: imageHeight * element.positionPercent.y,
            imageWidth,
            imageHeight
          });
          compositeLayers.push({ input: layer, top: 0, left: 0 });
        }
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
    });

    const allGeneratedData = await Promise.all(generatedDataPromises);

    // 5. Upload ke Supabase secara Paralel
    const uploadPromises = allGeneratedData.map(async (data) => {
      const certPath = `sertifikat-${data.name.replace(
        /\s+/g,
        "-"
      )}-${Date.now()}.jpeg`;
      await supabase.storage
        .from("generated-certificates")
        .upload(certPath, data.buffer, { contentType: "image/jpeg" });
      const {
        data: { publicUrl }
      } = supabase.storage
        .from("generated-certificates")
        .getPublicUrl(certPath);
      return { name: data.name, url: publicUrl, rowData: data.rowData };
    });

    const allUploadedCerts = await Promise.all(uploadPromises);

    // 6. Simpan Metadata ke Firestore dalam Satu Batch
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
