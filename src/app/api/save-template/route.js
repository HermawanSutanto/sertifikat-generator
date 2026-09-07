// src/app/api/save-template/route.js

import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";
import { db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req) {
  try {
    // 1. Autentikasi Pengguna
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Token tidak valid" },
        { status: 401 }
      );
    }
    const idToken = authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (!uid) {
      return NextResponse.json(
        { message: "UID tidak ditemukan" },
        { status: 403 }
      );
    }

    // 2. Ambil data desain dari body request
    const templateData = await req.json();

    if (!templateData.elements || templateData.elements.length === 0) {
      return NextResponse.json(
        { message: "Data desain tidak lengkap" },
        { status: 400 }
      );
    }

    // 3. Simpan ke Firestore
    // Kita buat collection baru bernama 'userTemplates'
    const docRef = await addDoc(collection(db, "userTemplates"), {
      userId: uid,
      name: templateData.name || "Template Tanpa Nama",
      width: templateData.width,
      height: templateData.height,
      elements: templateData.elements, // Menyimpan array elemen
      createdAt: serverTimestamp()
    });

    return NextResponse.json({
      message: "Template berhasil disimpan!",
      templateId: docRef.id
    });
  } catch (error) {
    console.error("Kesalahan saat menyimpan template:", error);
    return NextResponse.json(
      { message: error.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}
