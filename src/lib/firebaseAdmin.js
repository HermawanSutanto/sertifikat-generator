// Firebase Admin SDK (hanya dipakai di server / route handler Node.js).
// Env di Vercel: FIREBASE_SERVICE_ACCOUNT_BASE64 = base64 dari file JSON service account.
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  let credentials = null;

  // 1. Coba baca dari FIREBASE_SERVICE_ACCOUNT_KEY_JSON jika tersedia
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;
  if (keyJson && keyJson !== "[SENSITIVE]" && keyJson.trim().startsWith("{")) {
    try {
      credentials = JSON.parse(keyJson);
    } catch (e) {
      console.warn("Gagal parse FIREBASE_SERVICE_ACCOUNT_KEY_JSON:", e.message);
    }
  }

  // 2. Jika belum, coba baca dari FIREBASE_SERVICE_ACCOUNT_BASE64
  if (!credentials) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (b64 && b64 !== "[SENSITIVE]") {
      try {
        const decoded = Buffer.from(b64, "base64").toString("utf8");
        if (decoded.trim().startsWith("{")) {
          credentials = JSON.parse(decoded);
        }
      } catch (e) {
        console.warn("Gagal parse FIREBASE_SERVICE_ACCOUNT_BASE64:", e.message);
      }
    }
  }

  if (!credentials) {
    throw new Error(
      "Kredensial Firebase Admin tidak ditemukan atau tidak valid. Pastikan FIREBASE_SERVICE_ACCOUNT_KEY_JSON atau FIREBASE_SERVICE_ACCOUNT_BASE64 telah diatur dengan benar."
    );
  }

  return initializeApp({ credential: cert(credentials) });
}

// Dibuat lazy agar build tidak gagal jika env belum tersedia saat build.
export const getAdminDb = () => getFirestore(getAdminApp());
export const getAdminAuth = () => getAuth(getAdminApp());