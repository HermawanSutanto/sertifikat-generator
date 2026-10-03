// src/app/api/payment/doku/notify/route.js
// POST /api/payment/doku/notify
// Webhook endpoint untuk menerima notifikasi pembayaran dari DOKU Jokul
// DOKU mengirim HTTP POST ke URL ini setelah pembayaran selesai/gagal

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyWebhookSignature } from "@/lib/doku";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // 1. Baca raw body untuk keperluan verifikasi signature
    const rawBody = await request.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Body tidak valid (bukan JSON)." }, { status: 400 });
    }

    // 2. Ekstrak header DOKU
    const requestId = request.headers.get("request-id") || request.headers.get("Request-Id") || "";
    const requestTimestamp = request.headers.get("request-timestamp") || request.headers.get("Request-Timestamp") || "";
    const incomingSignature = request.headers.get("signature") || request.headers.get("Signature") || "";

    // 3. Verifikasi HMAC-SHA256 signature (skip di mode mock)
    const isMockEnv = !process.env.DOKU_CLIENT_ID || !process.env.DOKU_SECRET_KEY;
    if (!isMockEnv && incomingSignature) {
      const targetPath = "/api/payment/doku/notify";
      const isValid = verifyWebhookSignature({
        requestId,
        requestTimestamp,
        targetPath,
        body: rawBody,
        incomingSignature,
      });

      if (!isValid) {
        console.warn("DOKU webhook: Signature tidak valid. Request-Id:", requestId);
        return NextResponse.json({ error: "Signature tidak valid." }, { status: 401 });
      }
    }

    // 4. Ekstrak data order dari payload DOKU
    // Struktur respons notifikasi DOKU Jokul:
    // { order: { invoice_number, amount }, transaction: { status, date } }
    const invoiceNumber =
      body?.order?.invoice_number ||
      body?.invoice_number ||
      body?.orderId ||
      null;

    const transactionStatus =
      (body?.transaction?.status || body?.status || "").toUpperCase();

    // DOKU status: SUCCESS, FAILED, EXPIRED, PENDING
    const amount =
      body?.order?.amount ||
      body?.amount ||
      0;

    if (!invoiceNumber) {
      console.warn("DOKU webhook: invoice_number tidak ditemukan di payload.", body);
      return NextResponse.json({ error: "invoice_number tidak ditemukan." }, { status: 400 });
    }

    const db = getAdminDb();
    const txRef = db.collection("transactions").doc(invoiceNumber);
    const txDoc = await txRef.get();

    if (!txDoc.exists) {
      // Idempotent: jika transaksi tidak ditemukan, kembalikan 200 agar DOKU tidak retry terus
      console.warn(`DOKU webhook: Transaksi ${invoiceNumber} tidak ditemukan di Firestore.`);
      return NextResponse.json({ success: true, message: "Transaksi tidak ditemukan (idempotent)." });
    }

    const txData = txDoc.data();

    // 5. Idempotency: abaikan jika status sudah final
    if (txData.status === "success" || txData.status === "failed") {
      return NextResponse.json({ success: true, message: "Status sudah final, diabaikan." });
    }

    // 6. Update status transaksi berdasarkan status DOKU
    const isSuccess = transactionStatus === "SUCCESS";
    const isFailed = transactionStatus === "FAILED" || transactionStatus === "EXPIRED";

    const updatedStatus = isSuccess ? "success" : isFailed ? "failed" : "pending";

    await txRef.update({
      status: updatedStatus,
      rawDokuResponse: body,
      dokuTransactionDate: body?.transaction?.date || null,
      updatedAt: new Date(),
    });

    // 7. Jika pembayaran sukses, upgrade subscription/quota user di Firestore
    if (isSuccess && txData.userId && txData.planId) {
      const userRef = db.doc(`users/${txData.userId}`);
      const userSnap = await userRef.get();
      const currentQuota = userSnap.exists ? (userSnap.data()?.maxActiveEvents || 1) : 1;
      const planId = txData.planId;
      const now = new Date();

      if (planId === "mahasiswa_bulanan") {
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await userRef.set(
          {
            subscription: "premium",
            subscriptionPlan: planId,
            subscriptionActivatedAt: now,
            subscriptionExpiresAt: expiresAt,
            maxActiveEvents: Math.max(currentQuota, 15),
            subscriptionUpdatedAt: now,
            lastPaymentOrderId: invoiceNumber,
            lastPaymentAmount: amount,
          },
          { merge: true }
        );
      } else {
        // mahasiswa_event_pass: Kuota event bertambah +1 secara permanen
        await userRef.set(
          {
            subscription: "premium",
            subscriptionPlan: planId,
            subscriptionActivatedAt: now,
            maxActiveEvents: currentQuota + 1,
            subscriptionUpdatedAt: now,
            lastPaymentOrderId: invoiceNumber,
            lastPaymentAmount: amount,
          },
          { merge: true }
        );
      }

      console.log(`✅ User ${txData.userId} berhasil diproses untuk paket ${planId} via orderId ${invoiceNumber}`);
    }

    return NextResponse.json({
      success: true,
      orderId: invoiceNumber,
      status: updatedStatus,
    });
  } catch (err) {
    console.error("POST /api/payment/doku/notify error:", err);
    // Return 200 agar DOKU tidak retry terus-menerus
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 200 }
    );
  }
}
