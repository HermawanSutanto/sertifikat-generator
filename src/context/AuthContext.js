// src/context/AuthContext.js
// Konteks otentikasi global dengan sinkronisasi status akun, role, dan subscription

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFirestore = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Langganan pembaruan realtime dokumen pengguna di Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        unsubscribeFirestore = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserData({ id: docSnap.id, ...docSnap.data() });
            } else {
              setUserData(null);
            }
            setLoading(false);
          },
          (err) => {
            console.warn("Koleksi user belum siap atau izin terbatas:", err.message);
            setLoading(false);
          }
        );
      } else {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Evaluasi hak administrator (dari field dokumen role atau environment NEXT_PUBLIC_ADMIN_EMAILS)
  const adminEmailsEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const isAdmin = Boolean(
    userData?.role === "admin" ||
    (user?.email && adminEmailsEnv.includes(user.email.toLowerCase()))
  );

  const isPremium = Boolean(
    userData?.subscription === "premium" ||
    isAdmin // Admin otomatis mendapatkan akses fasilitas premium
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        isAdmin,
        isPremium,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
