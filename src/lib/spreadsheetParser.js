// src/lib/spreadsheetParser.js
// Parser terpadu untuk Data Peserta: CSV dan Excel (.xlsx, .xls) dengan evaluasi formula cerdas.

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FILE_LIMITS, validateUploadFile } from "./fileValidators";

const EXCEL_FORMULA_ERRORS = new Set([
  "#NULL!",
  "#DIV/0!",
  "#VALUE!",
  "#REF!",
  "#NAME?",
  "#NUM!",
  "#N/A",
  "#ERROR!",
]);

/**
 * Membersihkan nilai sel dari error rumus Excel
 */
function sanitizeCellValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (EXCEL_FORMULA_ERRORS.has(str)) return "";
  return str;
}

/**
 * Membaca dan mem-parsing berkas data peserta (.csv, .xlsx, .xls)
 *
 * @param {File} file Berkas CSV atau Excel
 * @returns {Promise<{ headers: string[], rows: object[], count: number }>}
 */
export async function parseParticipantSpreadsheet(file) {
  // 1. Validasi tipe dan batas ukuran
  const validation = validateUploadFile(file, FILE_LIMITS.PARTICIPANT_DATA);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileNameLower = file.name.toLowerCase();
  const isExcel = fileNameLower.endsWith(".xlsx") || fileNameLower.endsWith(".xls");

  if (isExcel) {
    return parseExcelFile(file);
  } else {
    return parseCsvFile(file);
  }
}

/**
 * Parsing berkas Excel (.xlsx / .xls) menggunakan SheetJS
 * Mengambil hasil kalkulasi formula (raw: false) dan mengabaikan syntax rumus mentah.
 */
async function parseExcelFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellFormula: false, // Jangan simpan rumus mentah
    cellHTML: false,
    cellText: true, // Ambil teks hasil formatting/kalkulasi
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("Berkas Excel tidak memiliki lembar kerja (sheet).");
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Ekstrak sebagai baris array 2D dengan nilai string hasil evaluasi (raw: false)
  const rawMatrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error("Lembar kerja Excel kosong.");
  }

  // Baris pertama adalah header
  const rawHeaders = rawMatrix[0] || [];
  const headers = rawHeaders.map((h, i) => String(h || `Kolom_${i + 1}`).trim());

  if (headers.length === 0 || headers.every((h) => !h)) {
    throw new Error("Baris pertama Excel harus berisi judul kolom (Header).");
  }

  const rows = [];
  for (let r = 1; r < rawMatrix.length; r++) {
    const rowArray = rawMatrix[r];
    if (!rowArray || rowArray.length === 0) continue;

    // Cek apakah seluruh sel di baris ini kosong
    const isRowEmpty = rowArray.every((cell) => !String(cell || "").trim());
    if (isRowEmpty) continue;

    const rowObj = {};
    headers.forEach((hdr, colIdx) => {
      rowObj[hdr] = sanitizeCellValue(rowArray[colIdx]);
    });

    rows.push(rowObj);
  }

  if (rows.length === 0) {
    throw new Error("Tidak ada data baris peserta yang ditemukan dalam berkas Excel.");
  }

  if (rows.length > FILE_LIMITS.PARTICIPANT_DATA.maxRows) {
    throw new Error(
      `Jumlah data (${rows.length} baris) melebihi batas maksimum ${FILE_LIMITS.PARTICIPANT_DATA.maxRows.toLocaleString()} baris per berkas.`
    );
  }

  return { headers, rows, count: rows.length };
}

/**
 * Parsing berkas CSV menggunakan PapaParse
 */
function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(`Gagal membaca berkas CSV: ${results.errors[0].message}`));
          return;
        }

        const headers = results.meta.fields?.map((f) => f.trim()).filter(Boolean) || [];
        if (headers.length === 0) {
          reject(new Error("Berkas CSV tidak memiliki judul kolom header."));
          return;
        }

        const rows = (results.data || [])
          .filter((row) => Object.values(row).some((val) => String(val || "").trim() !== ""))
          .map((row) => {
            const clean = {};
            headers.forEach((h) => {
              clean[h] = sanitizeCellValue(row[h]);
            });
            return clean;
          });

        if (rows.length === 0) {
          reject(new Error("Tidak ada baris data peserta yang valid di berkas CSV."));
          return;
        }

        if (rows.length > FILE_LIMITS.PARTICIPANT_DATA.maxRows) {
          reject(
            new Error(
              `Jumlah baris (${rows.length}) melebihi batas maksimum ${FILE_LIMITS.PARTICIPANT_DATA.maxRows.toLocaleString()} baris per berkas.`
            )
          );
          return;
        }

        resolve({ headers, rows, count: rows.length });
      },
      error: (err) => {
        reject(new Error(`Galat membaca CSV: ${err.message}`));
      },
    });
  });
}
