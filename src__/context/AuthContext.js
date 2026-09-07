// src/context/AuthContext.js

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase"; // <-- Impor 'auth' langsung

// Buat Context
export const AuthContext = createContext({});

// Buat custom hook untuk kemudahan penggunaan
export const useAuth = () => useContext(AuthContext);

// Buat Provider
export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Kita bisa menyimpan lebih banyak data jika perlu,
        // tapi untuk sekarang kita simpan objek user-nya langsung.
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {loading ? <div>Memuat sesi...</div> : children}
    </AuthContext.Provider>
  );
};
