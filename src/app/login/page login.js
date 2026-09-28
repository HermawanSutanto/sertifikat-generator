"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const EyeIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3z"
    />
  </svg>
);

const EyeSlashIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M12 7c2.76 0 5 2.24 5 5c0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28l.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22L21 20.73L3.27 3L2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65c0 1.66 1.34 3 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53c-2.76 0-5-2.24-5-5c0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15l.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
    />
  </svg>
);

const IconGoogle = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const ensureUserAndOrgExist = async (firebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      await updateDoc(userDocRef, {
        terakhirLogin: serverTimestamp(),
      });
      return;
    }

    // Jika pengguna pertama kali login via Google tanpa mendaftar terlebih dahulu
    const resolvedName =
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "Pengguna SertiGen";

    const defaultOrgName = `Ruang Kerja ${resolvedName}`;

    const newOrgRef = await addDoc(collection(db, "organizations"), {
      namaOrganisasi: defaultOrgName,
      tipeOrganisasi: "personal",
      emailResmi: firebaseUser.email || "",
      website: "",
      nomorTelepon: "",
      alamat: { jalan: "", kota: "" },
      branding: { logoUrl: null, capStempelUrl: null },
      nomorSuratFormat: { prefix: "SERTI", kodeBagian: "IND" },
      pemilikId: firebaseUser.uid,
      dibuatPada: serverTimestamp(),
      diperbaruiPada: serverTimestamp(),
    });

    await setDoc(userDocRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      namaLengkap: resolvedName,
      nomorWhatsapp: "",
      jabatan: "Penyelenggara Mandiri",
      accountType: "personal",
      activeOrgId: newOrgRef.id,
      organizations: [
        {
          orgId: newOrgRef.id,
          role: "owner",
          namaOrganisasi: defaultOrgName,
        },
      ],
      dibuatPada: serverTimestamp(),
      terakhirLogin: serverTimestamp(),
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await ensureUserAndOrgExist(userCredential.user);
      router.push("/dashboard");
    } catch (err) {
      console.error("Error logging in:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Email atau kata sandi yang Anda masukkan salah.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Terlalu banyak percobaan gagal. Silakan coba lagi beberapa saat.");
      } else {
        setError("Gagal masuk: " + (err.message || "Periksa koneksi Anda."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      await ensureUserAndOrgExist(result.user);
      router.push("/dashboard");
    } catch (err) {
      console.error("Gagal login Google:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Gagal masuk via Google: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex items-center justify-center min-h-screen bg-[#EBE9E4] px-4 py-12">
      <div
        className="hidden md:block absolute right-16 top-16 w-24 h-24 rounded-full border-2 border-[#111111]/10 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="hidden md:block absolute left-16 bottom-16 w-32 h-32 rounded-full border border-dashed border-[#111111]/10 pointer-events-none"
        aria-hidden="true"
      />

      <Link
        href="/"
        title="Kembali ke Beranda"
        className="absolute top-6 left-6 flex items-center justify-center w-10 h-10 rounded-[4px] text-[#111111] hover:bg-[#111111]/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      </Link>

      <div className="relative w-full max-w-md p-8 sm:p-10 space-y-6 bg-[#FFFFFF] rounded-[4px] shadow-2xl border border-[#111111]">
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/"
            className="text-lg font-bold uppercase tracking-tight text-[#111111] hover:text-[#0000EE] transition-colors"
            style={{ fontFamily: "var(--font-display, inherit)" }}
          >
            SERTIGEN.
          </Link>
          <h1
            className="text-2xl sm:text-3xl font-bold text-center text-[#111111] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display, inherit)" }}
          >
            Selamat Datang Kembali
          </h1>
          <p className="text-xs text-[#555555] text-center font-mono">
            Masuk untuk mengakses dashboard manajemen sertifikat.
          </p>
        </div>

        {}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-2.5 px-4 font-mono text-xs uppercase font-semibold text-[#111111] bg-white border border-[#111111]/30 hover:border-[#111111] rounded-[4px] hover:bg-[#F5F4F0] transition-colors flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
        >
          <IconGoogle />
          <span>Lanjut dengan Google</span>
        </button>

        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-[#111111]/15" />
          <span className="shrink mx-3 text-[#777777] text-[10px] font-mono uppercase tracking-wider">
            atau gunakan email
          </span>
          <div className="flex-grow border-t border-[#111111]/15" />
        </div>

        {}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nama@email.com"
              className="w-full px-3.5 py-2.5 text-xs font-mono text-[#111111] border border-[#111111]/25 bg-white rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0000EE]/50 focus:border-[#0000EE] transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs text-[#111111] border border-[#111111]/25 bg-white rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0000EE]/50 focus:border-[#0000EE] transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-[#111111]/50 hover:text-[#111111]"
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[#B3261E] text-xs font-semibold text-center font-mono bg-[#B3261E]/10 p-2.5 rounded border border-[#B3261E]/30">
              [!] {error}
            </p>
          )}

          {}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 font-mono text-xs font-semibold uppercase tracking-wide text-white bg-[#111111] rounded-[4px] hover:bg-[#0000EE] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <span>Login ke Dashboard →</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#555555] font-mono pt-2 border-t border-[#111111]/10">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-[#0000EE] hover:underline">
            Register di sini
          </Link>
        </p>
      </div>
    </main>
  );
}