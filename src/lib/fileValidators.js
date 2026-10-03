// src/lib/fileValidators.js
// Standardisasi batasan tipe dan ukuran file upload di seluruh aplikasi SertiGen.

export const FILE_LIMITS = {
  TEMPLATE: {
    maxSizeBytes: 15 * 1024 * 1024, // 15 MB
    maxSizeLabel: "15 MB",
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".svg"],
    acceptAttribute: ".pdf,.png,.jpg,.jpeg,.webp,.svg,application/pdf,image/png,image/jpeg,image/webp,image/svg+xml",
    label: "Template Sertifikat (PDF, PNG, JPG, WEBP, SVG)",
  },
  IMAGE_ELEMENT: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxSizeLabel: "5 MB",
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".bmp"],
    acceptAttribute: "image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.svg,.gif,.bmp",
    label: "Elemen Gambar / Logo (PNG, JPG, WEBP, SVG)",
  },
  PARTICIPANT_DATA: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxSizeLabel: "10 MB",
    maxRows: 10000,
    allowedExtensions: [".csv", ".xlsx", ".xls"],
    acceptAttribute: ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
    label: "Data Peserta (CSV, Excel .xlsx, .xls)",
  },
  CUSTOM_FONT: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxSizeLabel: "5 MB",
    allowedExtensions: [".ttf", ".otf", ".woff", ".woff2"],
    acceptAttribute: ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2",
    label: "Font Kustom (TTF, OTF, WOFF, WOFF2)",
  },
  LAYOUT_JSON: {
    maxSizeBytes: 2 * 1024 * 1024, // 2 MB
    maxSizeLabel: "2 MB",
    allowedExtensions: [".json"],
    acceptAttribute: ".json,application/json",
    label: "Tata Letak JSON (.json)",
  },
};

/**
 * Validasi berkas berdasarkan aturan yang ditentukan
 * @param {File} file Objek file yang diunggah
 * @param {object} rule Aturan dari FILE_LIMITS
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateUploadFile(file, rule) {
  if (!file) {
    return { valid: false, error: "Tidak ada berkas yang dipilih." };
  }

  // 1. Cek ukuran file
  if (file.size > rule.maxSizeBytes) {
    return {
      valid: false,
      error: `Ukuran berkas "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum ${rule.maxSizeLabel}.`,
    };
  }

  // 2. Cek ekstensi file
  const fileNameLower = file.name.toLowerCase();
  const hasValidExt = rule.allowedExtensions.some((ext) => fileNameLower.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: `Format berkas "${file.name}" tidak didukung. Format yang diizinkan: ${rule.allowedExtensions.join(", ")}.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Validasi berkas dan lempar Error jika tidak valid
 * @param {File} file
 * @param {object} rule
 */
export function validateFile(file, rule) {
  const result = validateUploadFile(file, rule);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return true;
}

