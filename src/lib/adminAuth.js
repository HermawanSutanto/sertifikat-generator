// src/lib/adminAuth.js
// Verifikasi otorisasi admin untuk route API server-side dan utilitas helper role

import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export function getAdminEmails() {
  const envList = [
    process.env.ADMIN_EMAILS,
    process.env.NEXT_PUBLIC_ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(",");

  return envList
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailConfiguredAdmin(email) {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase().trim());
}

/**
 * Memverifikasi request API dari header Authorization Bearer token.
 * Memastikan pemanggil memiliki hak akses Administrator.
 */
export async function verifyAdminRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { authorized: false, status: 401, error: "Token otentikasi tidak ditemukan." };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const email = decodedToken.email?.toLowerCase().trim();

    // 1. Cek apakah email terdaftar dalam daftar ADMIN_EMAILS environment
    if (isEmailConfiguredAdmin(email)) {
      return { authorized: true, user: decodedToken };
    }

    // 2. Cek apakah dokumen Firestore users/{uid} memiliki role 'admin'
    const userDoc = await getAdminDb().doc(`users/${decodedToken.uid}`).get();
    if (userDoc.exists && userDoc.get("role") === "admin") {
      return { authorized: true, user: decodedToken };
    }

    return {
      authorized: false,
      status: 403,
      error: "Akses ditolak: Anda tidak memiliki wewenang administrator.",
    };
  } catch (err) {
    console.error("verifyAdminRequest error:", err.message);
    return {
      authorized: false,
      status: 401,
      error: "Sesi otentikasi tidak valid atau telah kedaluwarsa.",
    };
  }
}
