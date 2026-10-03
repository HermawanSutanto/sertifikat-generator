// Firebase Admin SDK (hanya dipakai di server / route handler Node.js).
// Env di Vercel: FIREBASE_SERVICE_ACCOUNT_BASE64 = base64 dari file JSON service account.
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 belum diatur di environment.");
  }
  const credentials = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  return initializeApp({ credential: cert(credentials) });
}

// Dibuat lazy agar build tidak gagal jika env belum tersedia saat build.
export const getAdminDb = () => getFirestore(getAdminApp());
export const getAdminAuth = () => getAuth(getAdminApp());