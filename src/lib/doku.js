// src/lib/doku.js
// Helper adapter untuk DOKU Jokul Payment Gateway
// Mendukung HMAC-SHA256 signature, sandbox/production environment, dan mock fallback

import crypto from "crypto";

// --- Konfigurasi Environment ---
const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID || "";
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY || "";
const DOKU_ENV = process.env.DOKU_ENV || "sandbox"; // "sandbox" | "production"
const IS_MOCK = !DOKU_CLIENT_ID || !DOKU_SECRET_KEY || DOKU_CLIENT_ID === "[SENSITIVE]";

export const DOKU_BASE_URL =
  DOKU_ENV === "production"
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";

// --- HMAC-SHA256 Signature ---

/**
 * Menghasilkan string komponen digest dari body request.
 * Body di-hash dengan SHA-256, lalu di-encode ke Base64.
 * @param {object|string} body - Request body (akan di-stringify jika object)
 * @returns {string} Base64-encoded SHA-256 digest
 */
export function buildBodyDigest(body) {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  return crypto.createHash("sha256").update(bodyStr).digest("base64");
}

/**
 * Membangun komponen string-to-sign sesuai spesifikasi DOKU Jokul.
 * Format: Client-Id:{clientId}\nRequest-Id:{requestId}\nRequest-Timestamp:{timestamp}\nRequest-Target:{path}\nDigest:{digest}
 * @param {object} params
 * @param {string} params.requestId  - UUID unik per request
 * @param {string} params.timestamp  - ISO-8601 timestamp (e.g. 2026-10-03T10:42:00Z)
 * @param {string} params.targetPath - Path endpoint (e.g. /checkout/v1/payment)
 * @param {string} params.digest     - Base64 SHA-256 digest dari request body
 * @returns {string}
 */
function buildStringToSign({ requestId, timestamp, targetPath, digest }) {
  return [
    `Client-Id:${DOKU_CLIENT_ID}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${targetPath}`,
    `Digest:${digest}`,
  ].join("\n");
}

/**
 * Menghasilkan HMAC-SHA256 signature dari string-to-sign menggunakan DOKU_SECRET_KEY.
 * @param {string} stringToSign
 * @returns {string} Base64-encoded HMAC-SHA256
 */
export function signRequest(stringToSign) {
  return crypto
    .createHmac("sha256", DOKU_SECRET_KEY)
    .update(stringToSign)
    .digest("base64");
}

/**
 * Membangun semua header otentikasi DOKU untuk satu request.
 * @param {object} params
 * @param {string} params.requestId  - UUID unik per request
 * @param {string} params.targetPath - Path endpoint
 * @param {object|string} params.body - Request body
 * @returns {{ "Client-Id": string, "Request-Id": string, "Request-Timestamp": string, Signature: string, Digest: string }}
 */
export function buildDokuHeaders({ requestId, targetPath, body }) {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const digest = buildBodyDigest(body);
  const stringToSign = buildStringToSign({ requestId, timestamp, targetPath, digest });
  const signature = signRequest(stringToSign);

  return {
    "Content-Type": "application/json",
    "Client-Id": DOKU_CLIENT_ID,
    "Request-Id": requestId,
    "Request-Timestamp": timestamp,
    Signature: `HMACSHA256=${signature}`,
    Digest: digest,
  };
}

/**
 * Memverifikasi signature webhook yang masuk dari DOKU.
 * @param {object} params
 * @param {string} params.requestId        - Header Request-Id dari webhook
 * @param {string} params.requestTimestamp - Header Request-Timestamp dari webhook
 * @param {string} params.targetPath       - Path endpoint notifikasi
 * @param {object|string} params.body      - Raw body webhook
 * @param {string} params.incomingSignature - Header Signature dari webhook (format: "HMACSHA256=...")
 * @returns {boolean} true jika signature valid
 */
export function verifyWebhookSignature({ requestId, requestTimestamp, targetPath, body, incomingSignature }) {
  const digest = buildBodyDigest(body);
  const stringToSign = buildStringToSign({
    requestId,
    timestamp: requestTimestamp,
    targetPath,
    digest,
  });
  const expected = `HMACSHA256=${signRequest(stringToSign)}`;
  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(incomingSignature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// --- Checkout API ---

/**
 * Membuat sesi pembayaran DOKU Jokul Checkout.
 * Pada mode mock (env belum dikonfigurasi), mengembalikan respons simulasi.
 * @param {object} params
 * @param {string} params.orderId      - Order ID unik (gunakan prefix + userId)
 * @param {number} params.amount       - Nominal pembayaran dalam IDR (integer)
 * @param {string} params.email        - Email pembeli
 * @param {string} params.name         - Nama pembeli
 * @param {string} params.description  - Deskripsi item pembayaran
 * @param {string} params.callbackUrl  - URL redirect setelah pembayaran
 * @param {string} params.notifyUrl    - Webhook URL untuk notifikasi DOKU
 * @returns {Promise<{ checkoutUrl: string, invoiceId: string, isMock: boolean }>}
 */
export async function createDokuCheckout({ orderId, amount, email, name, description, callbackUrl, notifyUrl }) {
  // --- Mock Fallback ---
  if (IS_MOCK) {
    const mockInvoiceId = `MOCK-${orderId}-${Date.now()}`;
    return {
      checkoutUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/billing?mock=1&orderId=${orderId}&invoiceId=${mockInvoiceId}`,
      invoiceId: mockInvoiceId,
      isMock: true,
    };
  }

  const requestId = crypto.randomUUID();
  const targetPath = "/checkout/v1/payment";
  const body = {
    client: {
      id: DOKU_CLIENT_ID,
    },
    order: {
      invoice_number: orderId,
      line_items: [
        {
          name: description,
          price: amount,
          quantity: 1,
        },
      ],
      amount: amount,
      currency: "IDR",
      callback_url: callbackUrl,
      auto_redirect: false,
    },
    payment: {
      payment_due_date: 60, // menit
    },
    customer: {
      name: name,
      email: email,
    },
    notification_urls: [{ url: notifyUrl, verb: "POST" }],
  };

  const headers = buildDokuHeaders({ requestId, targetPath, body });

  const response = await fetch(`${DOKU_BASE_URL}${targetPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`DOKU API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Respons DOKU: { response: { payment: { url: "..." } }, ... }
  const checkoutUrl = data?.response?.payment?.url || data?.payment?.url;
  const invoiceId = data?.order?.invoice_number || orderId;

  if (!checkoutUrl) {
    throw new Error("DOKU tidak mengembalikan checkout URL. Respons: " + JSON.stringify(data));
  }

  return { checkoutUrl, invoiceId, isMock: false };
}

// --- Paket Khusus Organisasi Mahasiswa & Kepanitiaan Kampus ---

export const SUBSCRIPTION_PLANS = {
  mahasiswa_event_pass: {
    id: "mahasiswa_event_pass",
    name: "Event Pass Mahasiswa",
    price: 25000,
    billingCycle: "once",
    cycleLabel: "sekali bayar",
    description: "1 Event mandiri permanen untuk panitia webinar, lomba, atau makrab",
    targetAudience: "Panitia Webinar, Lomba, Seminar, & Makrab Kampus",
    features: [
      "1 Slot Acara Mandiri (Hingga 1.000 peserta)",
      "Bebas Watermark SertiGen",
      "Portal Unduhan Publik Mandiri (Cari nama langsung unduh)",
      "Fitur Pengajuan Koreksi / Revisi Nama oleh Peserta",
      "Ekspor Arsip Massal ZIP Seluruh Sertifikat",
      "Penyimpanan Database Peserta Awan Terjamin",
    ],
    badge: "Paling Populer",
  },
  mahasiswa_bulanan: {
    id: "mahasiswa_bulanan",
    name: "Paket BEM & Himpunan",
    price: 49000,
    billingCycle: "monthly",
    cycleLabel: "bulan (bebas stop)",
    description: "Untuk BEM, DPM, & Himpunan dengan banyak proker aktif sepanjang periode",
    targetAudience: "BEM, Himpunan Mahasiswa Jurusan, & UKM Kampus",
    features: [
      "Hingga 15 Acara Aktif Simultan",
      "Hingga 2.500 Peserta per Acara",
      "Bebas Watermark SertiGen di Semua Acara",
      "Kustomisasi Logo & Banner Organisasi di Portal Unduhan",
      "Fitur Pengajuan Koreksi / Revisi Nama oleh Peserta",
      "Ekspor Arsip Massal ZIP Resolusi Cetak Penuh",
    ],
    badge: "Hemat Proker",
  },
};

/**
 * Mengambil detail paket berdasarkan ID paket.
 * @param {string} planId
 * @returns {object|null}
 */
export function getPlanById(planId) {
  return SUBSCRIPTION_PLANS[planId] || null;
}

/**
 * Menghasilkan Order ID unik berdasarkan userId dan planId.
 * Format: SG-{planPrefix}-{userId8char}-{timestamp}
 * @param {string} userId
 * @param {string} planId
 * @returns {string}
 */
export function generateOrderId(userId, planId) {
  const prefix = planId === "mahasiswa_event_pass" ? "SGEP" : "SGBM";
  const userShort = (userId || "unknown").slice(0, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${userShort}-${ts}`;
}

