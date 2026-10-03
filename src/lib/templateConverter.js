// src/lib/templateConverter.js
// Utilitas konversi gambar template ke dokumen PDF beresolusi tinggi (pdf-lib)
// dan normalisasi elemen gambar kanvas ke format PNG transparan.

import { PDFDocument } from "pdf-lib";

/**
 * Memuat objek File gambar ke HTML Image element untuk mendapatkan dimensi aslinya
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Gagal memuat gambar: format tidak dapat dibaca oleh peramban.`));
    };
    img.src = objectUrl;
  });
}

/**
 * Mengonversi gambar apa pun (PNG, JPG, WEBP, SVG) menjadi berkas PDF 1-halaman
 * beresolusi 1:1 sesuai ukuran asli gambar.
 * Jika berkas yang diunggah sudah PDF, dikembalikan langsung.
 *
 * @param {File} file Berkas template (PDF atau Gambar)
 * @returns {Promise<File>} Objek File bertipe application/pdf
 */
export async function ensurePdfTemplate(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return file;
  }

  // 1. Dapatkan dimensi asli gambar
  const img = await loadImageFromFile(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (!width || !height) {
    throw new Error("Dimensi gambar template tidak valid (0x0).");
  }

  // 2. Render gambar ke canvas off-screen untuk memastikan format bitmap bersih
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  // Cek apakah gambar memiliki transparansi (alpha channel)
  const isJpegCandidate = file.type === "image/jpeg" || file.type === "image/jpg";
  let imageBytes;
  let isPng = true;

  if (isJpegCandidate) {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const base64 = dataUrl.split(",")[1];
    imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    isPng = false;
  } else {
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    isPng = true;
  }

  // 3. Bangun dokumen PDF 1-halaman dengan pdf-lib
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);

  let embeddedImage;
  if (isPng) {
    embeddedImage = await pdfDoc.embedPng(imageBytes);
  } else {
    embeddedImage = await pdfDoc.embedJpg(imageBytes);
  }

  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const outputFileName = `${baseName}_converted.pdf`;

  return new File([pdfBytes], outputFileName, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}

/**
 * Menormalisasi elemen gambar kanvas apa pun (SVG, WEBP, JPG, GIF)
 * menjadi file PNG transparan standar.
 *
 * @param {File} file Berkas gambar kustom
 * @returns {Promise<File>} Objek File bertipe image/png
 */
export async function normalizeImageToPng(file) {
  if (file.type === "image/png" && file.name.toLowerCase().endsWith(".png")) {
    return file;
  }

  const img = await loadImageFromFile(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Gagal mengonversi gambar ke format PNG."));
          return;
        }
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const convertedFile = new File([blob], `${baseName}.png`, {
          type: "image/png",
          lastModified: Date.now(),
        });
        resolve(convertedFile);
      },
      "image/png"
    );
  });
}
