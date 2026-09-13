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
import fs from "fs/promises";
import path from "path";
import os from "os";

// PATCH: naikkan batas durasi function di Vercel (default 10s di Hobby,
// 60s di Pro). Proses generate massal (render + composite + upload per baris)
// bisa lama untuk CSV besar. Sesuaikan dengan plan Vercel yang dipakai
// (maksimum 300s di Pro/Enterprise dengan konfigurasi khusus).
// Kalau volume sertifikat makin besar ke depan, pertimbangkan pindah ke
// arsitektur queue/background job (misal Vercel Queue / Inngest / QStash)
// alih-alih memproses semua baris CSV secara sinkron dalam satu request.
export const maxDuration = 300;

// PATCH: generate & upload sekarang digabung jadi satu pipeline per baris
// (lihat komentar di POST handler), jadi cukup satu angka konkurensi yang
// mengatur berapa banyak baris CSV diproses (generate+upload) bersamaan.
// UPLOAD_CONCURRENCY terpisah sudah tidak diperlukan lagi.
const GENERATE_CONCURRENCY = 5;

// PATCH: batas jumlah baris CSV per request. Tanpa ini, request dengan CSV
// sangat besar berisiko timeout function, boros biaya Supabase/Firestore,
// dan sulit di-recover kalau gagal di tengah jalan. Sesuaikan angka ini
// dengan kapasitas plan Vercel yang dipakai.
const MAX_CSV_ROWS = 500;

// PATCH: batas ukuran batch write Firestore. Firestore writeBatch punya
// hard limit 500 operasi per batch — di atas itu, commit() akan throw dan
// SEMUA write dalam batch tersebut gagal, walau file-nya sudah terlanjur
// ter-upload ke Supabase Storage.
const FIRESTORE_BATCH_LIMIT = 450; // beri margin dari limit keras 500

// PATCH: flag untuk debug logging verbose. Sebelumnya banyak console.log
// (termasuk SVG mentah & data per-baris CSV) tercetak untuk SETIAP baris di
// production, membebani log storage/biaya dan berpotensi membocorkan data
// pengguna ke log. Sekarang digate di belakang env var, konsisten dengan
// pola DEBUG_TEXT_LAYER yang sudah ada di file ini.
const DEBUG_VERBOSE = process.env.DEBUG_VERBOSE_LOGS === "true";
function debugLog(...args) {
  if (DEBUG_VERBOSE) console.log(...args);
}

// Cache PATH FILE font (bukan buffer) — resvg-js v2.6.2 hanya menerima
// `fontFiles: string[]` (path lokal), TIDAK ADA opsi `fontBuffers`.
// Font di-download sekali lalu ditulis ke /tmp (satu-satunya folder writable
// di Vercel serverless functions), path-nya di-cache untuk request berikutnya
// dalam siklus hidup instance yang sama (warm start).
const fontFilePathCache = new Map();

const fontUrlMap = {
  // Direct link CDN jsDelivr dari repository Google Fonts
  // PENTING: fontWeight harus SAMA PERSIS dengan weight file TTF yang di-fetch.
  // Kalau tidak cocok, resvg gagal mencocokkan font (loadSystemFonts:false
  // membuatnya tanpa fallback) dan teks tidak akan ter-render sama sekali.
  Roboto: {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf",
    weight: 700
  },
  Montserrat: {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf",
    weight: 700
  },
  "Playfair Display": {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-normal.ttf",
    weight: 700
  },
  Poppins: {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.ttf",
    weight: 700
  },
  Lora: {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-700-normal.ttf",
    weight: 700
  },
  Pacifico: {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/pacifico@latest/latin-400-normal.ttf",
    weight: 400
  },
  Caveat: {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/caveat@latest/latin-700-normal.ttf",
    weight: 700
  }
};

// PATCH: fontFamily datang dari input client (textElements). Sebelumnya
// dipakai langsung di dalam atribut SVG (style="...font-family:'${fontFamily}'...")
// tanpa sanitasi apapun — hanya nilai TEKS yang di-escape lewat sanitizeSvgText,
// bukan fontFamily/textColor/fontSize/fontWeight. Fungsi ini memastikan
// fontFamily yang dipakai HANYA salah satu dari whitelist fontUrlMap,
// mencegah attribute/markup injection ke SVG lewat field ini.
function sanitizeFontFamily(fontFamily) {
  return Object.prototype.hasOwnProperty.call(fontUrlMap, fontFamily)
    ? fontFamily
    : "Roboto";
}

function getFontWeight(fontFamily) {
  return (fontUrlMap[fontFamily] || fontUrlMap["Roboto"]).weight;
}

async function getFontTtfFilePath(fontFamily) {
  if (fontFilePathCache.has(fontFamily)) {
    debugLog(`[DEBUG] Font ${fontFamily} diambil dari cache (path: ${fontFilePathCache.get(fontFamily)}).`);
    return fontFilePathCache.get(fontFamily);
  }

  const ttfUrl = (fontUrlMap[fontFamily] || fontUrlMap["Roboto"]).url;
  debugLog(`[DEBUG] Mencoba mengunduh font: ${fontFamily} dari ${ttfUrl}`);

  try {
    const fontResponse = await fetch(ttfUrl);
    if (!fontResponse.ok) {
      throw new Error(`HTTP ${fontResponse.status}: Gagal mengunduh file font TTF (${fontFamily})`);
    }
    const arrayBuffer = await fontResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // DEBUG: cek magic bytes TTF/OTF (harus mulai dengan 00 01 00 00 atau 'OTTO'/'true')
    const header = buffer.subarray(0, 4).toString("hex");
    debugLog(`[DEBUG] Font ${fontFamily} berhasil diunduh (${buffer.length} bytes), header: ${header}`);

    if (buffer.length < 1000) {
      console.warn(`[WARN] Font ${fontFamily} mencurigakan kecil (${buffer.length} bytes) — kemungkinan bukan font valid (misal HTML error page ter-cache sebagai buffer).`);
    }

    // Tulis ke /tmp karena resvg-js butuh PATH FILE, bukan buffer in-memory
    const safeFileName = fontFamily.replace(/[^a-zA-Z0-9]/g, "-");
    const filePath = path.join(os.tmpdir(), `font-${safeFileName}.ttf`);
    await fs.writeFile(filePath, buffer);
    debugLog(`[DEBUG] Font ${fontFamily} ditulis ke ${filePath}`);

    fontFilePathCache.set(fontFamily, filePath);
    return filePath;
  } catch (error) {
    console.error(`[ERROR] Gagal fetching/menulis font ttf (${fontFamily}):`, error.message);
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

// PATCH: sanitasi tambahan untuk nilai yang masuk ke dalam atribut/inline-style
// SVG selain teks (textColor, fontWeight). fontFamily sudah dijamin aman lewat
// whitelist sanitizeFontFamily() di pemanggilnya, jadi di sini fokus ke
// textColor & fontWeight yang juga berasal dari input client.
function sanitizeCssValue(value) {
  return String(value).replace(/[^a-zA-Z0-9#(),.\s%-]/g, "");
}

// SVG polos TANPA @font-face (resvg akan mencocokkan font dari fontFiles)
// CATATAN: dominant-baseline="middle" dihapus karena dukungan resvg/usvg untuk
// properti ini tidak konsisten dan bisa menyebabkan teks tidak ter-render sama
// sekali atau posisinya meleset jauh dari viewBox. Diganti offset manual.
function generateCombinedSvgLayer({ items, imageWidth, imageHeight }) {
  const textNodes = items
    .map(({ text, textColor, fontSize, fontFamily, positionX, positionY, fontWeight }) => {
      // Offset manual pengganti dominant-baseline="middle"
      // (perkiraan umum: turunkan baseline ~35% dari font-size agar teks
      // secara visual center terhadap positionY)
      const adjustedY = positionY + fontSize * 0.35;
      const safeFontFamily = sanitizeFontFamily(fontFamily);
      const safeTextColor = sanitizeCssValue(textColor);
      const safeFontWeight = sanitizeCssValue(fontWeight);

      return `
      <text x="${positionX}" y="${adjustedY}" text-anchor="middle"
        style="fill:${safeTextColor}; font-size:${fontSize}px; font-family:'${safeFontFamily}'; font-weight:${safeFontWeight};">
        ${sanitizeSvgText(text)}
      </text>`;
    })
    .join("\n");

  return `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      ${textNodes}
    </svg>`;
}

function renderTextLayerToPng({ svg, imageWidth, fontFilePaths }) {
  debugLog(`[DEBUG] Rendering text layer. fontFilePaths:`, fontFilePaths);
  // DEBUG: cetak SVG mentah untuk memastikan teks, posisi, dan struktur valid
  debugLog(`[DEBUG] SVG string:`, svg);

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: imageWidth },
    font: {
      fontFiles: fontFilePaths,   // API resvg-js v2.x: path file lokal, BUKAN buffer
      loadSystemFonts: false,     // Mematikan font sistem Vercel/Linux
      defaultFontFamily: "Roboto" // Fallback jika font-family tidak terindikasi presisi
    },
    logLevel: DEBUG_VERBOSE ? "debug" : "error"
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  debugLog(`[DEBUG] Text layer PNG size: ${pngBuffer.length} bytes, dimensions: ${pngData.width}x${pngData.height}`);

  return pngBuffer;
}

// PATCH: commit Firestore writes per chunk (di bawah hard limit 500 operasi
// per batch). Kalau salah satu chunk gagal, chunk lain yang sudah commit
// tetap tersimpan — jadi kegagalan tidak menghapus SEMUA metadata yang
// sudah berhasil, dan kita bisa laporkan sertifikat mana saja yang gagal
// tersimpan metadatanya (walau filenya sudah ada di Supabase Storage).
async function commitCertMetadataInChunks(uid, allUploadedCerts, textElements) {
  const savedCerts = [];
  const failedCerts = [];

  for (let i = 0; i < allUploadedCerts.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = allUploadedCerts.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((cert) => {
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

    try {
      await batch.commit();
      savedCerts.push(...chunk);
    } catch (error) {
      console.error(
        `[ERROR] Gagal commit batch Firestore untuk ${chunk.length} sertifikat:`,
        error.message
      );
      // File-nya sudah ada di Supabase walau metadata gagal tersimpan —
      // tetap kembalikan URL-nya ke client, tapi tandai sebagai "belum
      // tercatat" supaya bisa di-retry / ditindaklanjuti secara manual.
      failedCerts.push(...chunk);
    }
  }

  return { savedCerts, failedCerts };
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

    // PATCH: cap jumlah baris CSV per request untuk menghindari timeout
    // function Vercel dan proses yang tidak ter-recover kalau gagal
    // di tengah jalan. Sesuaikan MAX_CSV_ROWS dengan kapasitas plan Vercel.
    if (csvData.length > MAX_CSV_ROWS) {
      return NextResponse.json(
        {
          message: `Jumlah baris CSV (${csvData.length}) melebihi batas maksimum ${MAX_CSV_ROWS} per proses. Silakan bagi CSV menjadi beberapa bagian.`
        },
        { status: 400 }
      );
    }

    const isManualMode = Object.keys(mapping).length === 0;

    // 3. Persiapan Gambar Template
    // PATCH (kualitas render): SEBELUMNYA template di-downscale + di-recompress
    // paksa ke JPEG quality 80 hanya berdasarkan UKURAN FILE (>2MB), tanpa
    // peduli resolusi piksel aslinya. Efeknya: template dengan foto latar
    // beresolusi tinggi (sangat umum, gampang >2MB) langsung dikompres kasar
    // di awal -- lalu di-composite dengan teks -- lalu di-kompres JPEG LAGI
    // di akhir. Dua kali lossy compression inilah penyebab utama hasil akhir
    // terlihat "jelek"/blocky, dan menaikkan quality di composite akhir saja
    // tidak menolong karena sumbernya sudah rusak duluan.
    // Sekarang gate-nya diganti ke DIMENSI PIKSEL, konsisten dengan
    // MAX_TEMPLATE_DIMENSION di bawah: template HANYA di-downscale kalau
    // sisi terpanjangnya benar-benar melebihi batas itu, dan kalau memang
    // perlu di-downscale, dipakai kualitas re-encode yang jauh lebih tinggi
    // (92 + mozjpeg, bukan 80) supaya detail tetap tajam. Template yang
    // resolusinya sudah wajar (mayoritas kasus) sama sekali tidak disentuh --
    // dipakai apa adanya, tanpa kompresi tambahan apapun.
    const originalTemplateBuffer = Buffer.from(await templateFile.arrayBuffer());
    const MAX_TEMPLATE_DIMENSION = 4000;

    const originalMetadata = await sharp(originalTemplateBuffer).metadata();
    const originalLongestSide = Math.max(
      originalMetadata.width || 0,
      originalMetadata.height || 0
    );

    let templateFileBuffer = originalTemplateBuffer;
    if (originalLongestSide > MAX_TEMPLATE_DIMENSION) {
      const isPortrait =
        (originalMetadata.height || 0) > (originalMetadata.width || 0);
      templateFileBuffer = await sharp(originalTemplateBuffer)
        .resize(
          isPortrait
            ? { height: MAX_TEMPLATE_DIMENSION, withoutEnlargement: true }
            : { width: MAX_TEMPLATE_DIMENSION, withoutEnlargement: true }
        )
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
    }

    const baseImage = sharp(templateFileBuffer);

    // PATCH: baca metadata gambar template DAN fetch font TTF secara PARALEL.
    // Sebelumnya dua operasi ini dijalankan berurutan padahal saling
    // independen (metadata tidak butuh font, font tidak butuh metadata) —
    // menjalankannya via Promise.all memangkas latensi total request,
    // terutama saat font belum ada di cache (cold start).
    // fontFamily di-sanitasi lewat whitelist sebelum dipakai untuk fetch,
    // supaya konsisten dengan yang dipakai saat render SVG nanti.
    const uniqueFontFamilies = [
      ...new Set(textElements.map((el) => sanitizeFontFamily(el.fontFamily)))
    ];
    debugLog(`[DEBUG] Font unik yang dibutuhkan:`, uniqueFontFamilies);

    const [metadata, fontFilePathsRaw] = await Promise.all([
      baseImage.metadata(),
      Promise.all(uniqueFontFamilies.map((family) => getFontTtfFilePath(family)))
    ]);
    const fontFilePaths = fontFilePathsRaw.filter(Boolean);

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    const scaleFactor = imageWidth / previewWidth;

    debugLog(`[DEBUG] Total font file paths yang berhasil disiapkan: ${fontFilePaths.length}/${uniqueFontFamilies.length}`);

    // PATCH: batas dimensi sekarang DIJAMIN oleh downscale otomatis di atas
    // (bagian "3. Persiapan Gambar Template") -- template tidak pernah lagi
    // melebihi MAX_TEMPLATE_DIMENSION di titik ini, jadi tidak perlu lagi
    // menolak request dengan error 400 seperti sebelumnya. Ini sekaligus
    // pengalaman yang lebih baik untuk user (template besar otomatis
    // disesuaikan, bukan ditolak mentah-mentah).

    // PATCH: kalau SEMUA font gagal di-fetch, sebelumnya kode tetap lanjut
    // dengan fontFilePaths kosong — resvg (loadSystemFonts:false) tidak
    // punya font sama sekali, sehingga semua teks di sertifikat tidak
    // ter-render, TAPI API tetap mengembalikan 200 sukses. Sekarang kita
    // gagalkan request secara eksplisit supaya masalah ketahuan sejak awal,
    // bukan setelah user membuka file sertifikatnya.
    if (uniqueFontFamilies.length > 0 && fontFilePaths.length === 0) {
      return NextResponse.json(
        {
          message:
            "Gagal memuat semua font yang dibutuhkan untuk render teks. Silakan coba lagi beberapa saat lagi."
        },
        { status: 502 }
      );
    }

    // 4 & 5. Generate + Upload per baris DALAM SATU PIPELINE
    // PATCH (optimasi memori & waktu): sebelumnya kode ini punya dua fase
    // terpisah — generate SEMUA baris dulu (menyimpan seluruh buffer JPEG
    // hasilnya di memori), baru upload SEMUA buffer itu setelahnya. Untuk
    // CSV besar (mendekati MAX_CSV_ROWS), ini berarti ratusan buffer JPEG
    // tertampung sekaligus di memori sebelum upload pertama sempat dimulai —
    // boros memori dan rawan mepet limit function di Vercel.
    // Sekarang digabung: tiap baris di-generate LALU LANGSUNG diupload dalam
    // worker yang sama, sebelum lanjut ke baris berikutnya. Efeknya memori
    // puncak turun signifikan (cuma ~GENERATE_CONCURRENCY buffer yang hidup
    // bersamaan, bukan seluruh CSV), dan upload baris yang satu (I/O-bound)
    // bisa berjalan bersamaan dengan generate baris lain (CPU-bound) di lane
    // konkuren yang berbeda.
    const primaryIdentifierLabel =
      textElements.find((el) => el.isLocked)?.label || textElements[0]?.label || "nama";

    const allUploadedCerts = (
      await runWithConcurrencyLimit(
        csvData,
        GENERATE_CONCURRENCY,
        async (row, index) => {
          // PATCH: isolasi error per-baris untuk KEDUA tahap (generate &
          // upload). runWithConcurrencyLimit tidak isolasi error sendiri —
          // worker yang throw akan menjatuhkan seluruh batch (lihat
          // lib/concurrency.js) — jadi try/catch di sini wajib membungkus
          // seluruh alur, bukan cuma sebagian.
          try {
            // PATCH: fallback nama file juga ditambahkan untuk mode manual,
            // sebelumnya fallback `sertifikat-${Date.now()}` hanya ada di
            // cabang non-manual sehingga mode manual bisa menghasilkan nama
            // file "sertifikat-undefined-<timestamp>.jpeg".
            const rawIdentifier = isManualMode
              ? row[primaryIdentifierLabel]
              : row[mapping[primaryIdentifierLabel]];
            const primaryIdentifier =
              rawIdentifier || `sertifikat-${Date.now()}-${index}`;

            const svgItems = [];
            for (const element of textElements) {
              const text = isManualMode
                ? row[element.label]
                : row[mapping[element.label]];

              if (!text) continue;

              const safeFontFamily = sanitizeFontFamily(element.fontFamily);
              svgItems.push({
                text,
                textColor: element.textColor,
                fontSize: Math.round(element.fontSize * scaleFactor),
                fontFamily: safeFontFamily,
                fontWeight: getFontWeight(safeFontFamily),
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
                fontFilePaths: fontFilePaths || []
              });

              // DEBUG: upload layer teks mentah (sebelum di-composite) supaya bisa
              // dilihat langsung apakah teksnya benar-benar ada/kosong/salah posisi.
              // Aktifkan dengan set env var DEBUG_TEXT_LAYER=true di Vercel.
              if (process.env.DEBUG_TEXT_LAYER === "true") {
                supabase.storage
                  .from("generated-certificates")
                  .upload(`debug-textlayer-${Date.now()}.png`, pngTextBuffer, {
                    contentType: "image/png"
                  })
                  .then(() => debugLog("[DEBUG] Debug text layer PNG diupload."))
                  .catch((e) => console.error("[DEBUG] Gagal upload debug text layer:", e.message));
              }

              compositeLayers.push({ input: pngTextBuffer, top: 0, left: 0 });
            }

            // PATCH: tambahkan mozjpeg untuk kompresi lebih baik di kualitas
            // visual yang sama -> file lebih kecil, upload lebih cepat, lebih
            // hemat storage. Butuh sharp yang dikompilasi dengan dukungan
            // mozjpeg (default di kebanyakan versi modern); kalau versi sharp
            // di project ini tidak mendukungnya, hapus opsi ini.
            const generatedCertBuffer = await baseImage
              .clone()
              .composite(compositeLayers)
              .jpeg({ quality: 95, mozjpeg: true })
              .toBuffer();

            // Langsung upload begitu buffer siap — tidak menunggu baris lain
            // selesai di-generate terlebih dahulu.
            const certPath = `sertifikat-${String(primaryIdentifier).replace(
              /\s+/g,
              "-"
            )}-${Date.now()}.jpeg`;
            const { error: uploadError } = await supabase.storage
              .from("generated-certificates")
              .upload(certPath, generatedCertBuffer, { contentType: "image/jpeg" });

            if (uploadError) {
              console.error(`Gagal upload sertifikat ${primaryIdentifier}:`, uploadError);
              return null;
            }

            const {
              data: { publicUrl }
            } = supabase.storage
              .from("generated-certificates")
              .getPublicUrl(certPath);

            return { name: primaryIdentifier, url: publicUrl, rowData: row };
          } catch (rowError) {
            console.error(
              `[ERROR] Gagal memproses (generate/upload) baris ke-${index}:`,
              rowError.message
            );
            return null;
          }
        }
      )
    ).filter(Boolean);

    if (allUploadedCerts.length === 0) {
      return NextResponse.json(
        {
          message:
            "Semua baris data gagal diproses atau diupload. Periksa kembali data CSV dan template Anda."
        },
        { status: 422 }
      );
    }

    // 6. Simpan Metadata ke Firestore
    // PATCH: commit per-chunk (lihat commitCertMetadataInChunks) supaya tidak
    // kena Firestore writeBatch limit 500 operasi, dan kegagalan satu chunk
    // tidak menghapus metadata chunk lain yang sudah berhasil tersimpan.
    const { failedCerts } = await commitCertMetadataInChunks(
      uid,
      allUploadedCerts,
      textElements
    );

    if (failedCerts.length > 0) {
      console.error(
        `[ERROR] ${failedCerts.length} sertifikat berhasil diupload ke Supabase tapi GAGAL tersimpan metadatanya di Firestore.`,
        failedCerts.map((c) => c.url)
      );
    }

    // 7. Kirim Response Sukses
    // PATCH: tetap kembalikan URL sertifikat yang filenya berhasil diupload
    // (termasuk yang metadatanya gagal), tapi beri tahu client kalau ada
    // sebagian yang gagal tersimpan metadatanya, supaya tidak "silently"
    // hilang dari pandangan user maupun tim support.
    return NextResponse.json({
      certificateUrls: allUploadedCerts.map((cert) => cert.url),
      ...(failedCerts.length > 0 && {
        warning: `${failedCerts.length} sertifikat berhasil dibuat namun gagal tercatat metadatanya. Silakan hubungi admin jika sertifikat tidak muncul di riwayat.`
      })
    });
  } catch (error) {
    console.error("Kesalahan di API generate:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}