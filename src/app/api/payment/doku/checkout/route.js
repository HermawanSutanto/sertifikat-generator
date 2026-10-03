// src/app/api/payment/doku/checkout/route.js
// POST /api/payment/doku/checkout
// Membuat sesi pembayaran DOKU Jokul Checkout untuk upgrade langganan premium

import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import {
  createDokuCheckout,
  getPlanById,
  generateOrderId,
  SUBSCRIPTION_PLANS,
} from "@/lib/doku";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // 1. Verifikasi Firebase ID token dari header Authorization
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
    const email = decodedToken.email || "";
    const name = decodedToken.name || email.split("@")[0] || "Pengguna";

    // 2. Validasi body request
    const body = await request.json().catch(() => ({}));
    const { planId } = body;

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return NextResponse.json(
        {
          error: "planId tidak valid. Pilihan tersedia: " + Object.keys(SUBSCRIPTION_PLANS).join(", "),
        },
        { status: 400 }
      );
    }

    const plan = getPlanById(planId);

    // 3. Cek apakah user sudah memiliki paket bulanan aktif (hindari double-charge)
    const db = getAdminDb();
    const userDoc = await db.doc(`users/${uid}`).get();
    if (userDoc.exists && planId === "mahasiswa_bulanan") {
      const subPlan = userDoc.get("subscriptionPlan");
      const expiresAt = userDoc.get("subscriptionExpiresAt")?.toDate?.() || new Date(userDoc.get("subscriptionExpiresAt") || 0);
      if (subPlan === "mahasiswa_bulanan" && expiresAt > new Date()) {
        return NextResponse.json(
          { error: "Akun Anda sudah memiliki Paket BEM & Himpunan yang aktif." },
          { status: 409 }
        );
      }
    }

    // 4. Buat order ID unik dan catat transaksi pending di Firestore
    const orderId = generateOrderId(uid, planId);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sertigen.krovida.id";

    const callbackUrl = `${baseUrl}/dashboard/billing?status=success&orderId=${orderId}`;
    const notifyUrl = `${baseUrl}/api/payment/doku/notify`;

    // Simpan transaksi dengan status "pending" sebelum request ke DOKU
    await db.collection("transactions").doc(orderId).set({
      orderId,
      userId: uid,
      email,
      planId,
      planName: plan.name,
      amount: plan.amount || plan.price,
      currency: "IDR",
      status: "pending",
      isMock: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Panggil DOKU API (atau mock fallback)
    const { checkoutUrl, invoiceId, isMock } = await createDokuCheckout({
      orderId,
      amount: plan.price,
      email,
      name,
      description: plan.description,
      callbackUrl,
      notifyUrl,
    });

    // Perbarui catatan transaksi dengan invoiceId dan flag mock
    await db.collection("transactions").doc(orderId).update({
      invoiceId,
      isMock,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      checkoutUrl,
      orderId,
      invoiceId,
      isMock,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        billingCycle: plan.billingCycle,
      },
    });
  } catch (err) {
    console.error("POST /api/payment/doku/checkout error:", err);
    return NextResponse.json(
      { error: "Gagal membuat sesi pembayaran: " + (err.message || "Internal server error") },
      { status: 500 }
    );
  }
}
