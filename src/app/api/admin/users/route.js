// src/app/api/admin/users/route.js
// Endpoint khusus Administrator untuk melihat dan mengelola daftar user & subscription

import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest, isEmailConfiguredAdmin } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/users
// Mengambil daftar seluruh pengguna terdaftar di sistem beserta data langganan
export async function GET(request) {
  try {
    const authResult = await verifyAdminRequest(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const db = getAdminDb();

    // 1. Ambil seluruh dokumen user
    const usersSnap = await db.collection("users").get();

    // 2. Ambil snapshot ringan dokumen events untuk menghitung jumlah event aktif per user
    const eventsSnap = await db.collection("events").select("userId").get();
    const eventCountsByUserId = {};
    eventsSnap.docs.forEach((doc) => {
      const uId = doc.get("userId");
      if (uId) {
        eventCountsByUserId[uId] = (eventCountsByUserId[uId] || 0) + 1;
      }
    });

    const users = usersSnap.docs.map((d) => {
      const data = d.data();
      const email = data.email || "";
      const isConfiguredAdmin = isEmailConfiguredAdmin(email);

      // Prioritas role: jika terdaftar di env ADMIN_EMAILS, otomatis admin
      const effectiveRole = isConfiguredAdmin ? "admin" : (data.role || "user");
      const effectiveSubscription = data.subscription || (effectiveRole === "admin" ? "premium" : "free");

      return {
        id: d.id,
        uid: data.uid || d.id,
        email: email,
        namaLengkap: data.namaLengkap || "Tanpa Nama",
        role: effectiveRole,
        subscription: effectiveSubscription,
        maxActiveEvents: data.maxActiveEvents ?? (effectiveSubscription === "premium" ? 50 : 1),
        accountType: data.accountType || "personal",
        activeEventsCount: eventCountsByUserId[d.id] || eventCountsByUserId[data.uid] || 0,
        dibuatPada: data.dibuatPada?.toDate ? data.dibuatPada.toDate().toISOString() : null,
        terakhirLogin: data.terakhirLogin?.toDate ? data.terakhirLogin.toDate().toISOString() : null,
      };
    });

    // Urutkan berdasarkan waktu pendaftaran terbaru
    users.sort((a, b) => {
      if (!a.dibuatPada) return 1;
      if (!b.dibuatPada) return -1;
      return new Date(b.dibuatPada).getTime() - new Date(a.dibuatPada).getTime();
    });

    return NextResponse.json({
      success: true,
      users,
      totalUsers: users.length,
      stats: {
        total: users.length,
        premium: users.filter((u) => u.subscription === "premium").length,
        free: users.filter((u) => u.subscription === "free").length,
        admins: users.filter((u) => u.role === "admin").length,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Gagal memuat data pengguna: " + (err.message || "Internal server error") },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users
// Mengubah status subscription (free/premium) atau role (user/admin) untuk pengguna tertentu
export async function PATCH(request) {
  try {
    const authResult = await verifyAdminRequest(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json().catch(() => ({}));
    const { targetUid, role, subscription, maxActiveEvents } = body;

    if (!targetUid || typeof targetUid !== "string") {
      return NextResponse.json({ error: "targetUid wajib disertakan." }, { status: 400 });
    }

    const updatePayload = {};

    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) {
        return NextResponse.json({ error: "Role hanya boleh 'user' atau 'admin'." }, { status: 400 });
      }
      updatePayload.role = role;
    }

    if (subscription !== undefined) {
      if (!["free", "premium"].includes(subscription)) {
        return NextResponse.json({ error: "Subscription hanya boleh 'free' atau 'premium'." }, { status: 400 });
      }
      updatePayload.subscription = subscription;
      if (maxActiveEvents === undefined) {
        updatePayload.maxActiveEvents = subscription === "premium" ? 50 : 1;
      }
    }

    if (maxActiveEvents !== undefined) {
      const num = Number(maxActiveEvents);
      if (isNaN(num) || num < 1) {
        return NextResponse.json({ error: "maxActiveEvents harus bernilai angka positif minimal 1." }, { status: 400 });
      }
      updatePayload.maxActiveEvents = num;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Tidak ada field perubahan yang diberikan." }, { status: 400 });
    }

    updatePayload.subscriptionUpdatedAt = new Date();
    updatePayload.updatedByAdminUid = authResult.user.uid;

    const db = getAdminDb();
    const userRef = db.doc(`users/${targetUid}`);
    await userRef.set(updatePayload, { merge: true });

    return NextResponse.json({
      success: true,
      targetUid,
      updated: updatePayload,
      message: "Data pengguna berhasil diperbarui.",
    });
  } catch (err) {
    console.error("PATCH /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui status pengguna: " + (err.message || "Internal server error") },
      { status: 500 }
    );
  }
}
