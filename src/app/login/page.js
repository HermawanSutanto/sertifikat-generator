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
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const EyeSlashIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

const IconGoogle = (props) => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...props}>
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
    <main className="min-h-screen bg-[#FFFFFF] text-[#111111] flex flex-col justify-center items-center px-6 py-16 selection:bg-[#111111] selection:text-white font-sans antialiased">
      <div className="w-full max-w-[380px] space-y-8">
        <div className="space-y-2 text-left">
          <Link
            href="/"
            className="text-xs font-medium tracking-tight uppercase text-[#6B7280] hover:text-[#111111] transition-colors inline-flex items-center gap-1.5"
          >
            ← Kembali ke Beranda
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
            Selamat datang kembali
          </h1>
          <p className="text-xs text-[#6B7280]">
            Masuk untuk mengakses dashboard manajemen sertifikat.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-wider rounded-md border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] hover:bg-[#F9FAFB] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          <IconGoogle />
          <span>Lanjut dengan Google</span>
        </button>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-[#E5E7EB]" />
          <span className="shrink mx-3 text-[#6B7280] text-xs uppercase tracking-wider">
            atau gunakan email
          </span>
          <div className="flex-grow border-t border-[#E5E7EB]" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nama@email.com"
              className="w-full px-3 py-2 text-xs text-[#111111] border border-[#E5E7EB] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#6B7280] hover:text-[#111111] transition-colors font-medium"
              >
                Lupa password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs text-[#111111] border border-[#E5E7EB] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-2.5 text-[#6B7280] hover:text-[#111111]"
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 p-2.5 rounded-md border border-red-200">
              [!] {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#111111] rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk ke Dashboard</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] pt-4 border-t border-[#E5E7EB]">
          Belum punya akun?{" "}
          <Link href="/register" className="text-[#111111] font-semibold hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </main>
  );
}