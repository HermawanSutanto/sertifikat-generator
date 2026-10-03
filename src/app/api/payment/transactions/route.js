// src/app/api/payment/transactions/route.js
// GET /api/payment/transactions
// Mengambil riwayat transaksi pembayaran milik user yang sedang login

import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // 1. Verifikasi Firebase ID token
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: "Token otentikasi tidak ditemukan." },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: "Sesi otentikasi tidak valid atau telah kedaluwarsa." },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;

    // 2. Query transaksi milik user (sort in-memory agar tidak mewajibkan Composite Index manual)
    const db = getAdminDb();
    const txSnap = await db
      .collection("transactions")
      .where("userId", "==", uid)
      .limit(50)
      .get();

    const transactions = txSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          orderId: d.id,
          planId: data.planId || null,
          planName: data.planName || null,
          amount: data.amount || 0,
          currency: data.currency || "IDR",
          status: data.status || "pending",
          isMock: data.isMock || false,
          invoiceId: data.invoiceId || null,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt
            ? new Date(data.createdAt).toISOString()
            : null,
          updatedAt: data.updatedAt?.toDate
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt
            ? new Date(data.updatedAt).toISOString()
            : null,
          dokuTransactionDate: data.dokuTransactionDate || null,
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return NextResponse.json({
      success: true,
      transactions,
      total: transactions.length,
    });
  } catch (err) {
    console.error("GET /api/payment/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal memuat riwayat transaksi: " + (err.message || "Internal server error") },
      { status: 500 }
    );
  }
}
