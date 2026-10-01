"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const sansFont = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

const monoFont =  Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

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

export default function RegisterPage() {
  const [accountType, setAccountType] = useState("personal");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [namaOrganisasi, setNamaOrganisasi] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const provisionUserAndOrg = async (firebaseUser, customFullName, customOrgName, type = "personal") => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) return;

    const resolvedFullName =
      customFullName?.trim() ||
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "Pengguna SertiGen";

    const resolvedOrgName =
      type === "organization"
        ? (customOrgName?.trim() || `Lembaga ${resolvedFullName}`)
        : (customOrgName?.trim() || `Ruang Kerja ${resolvedFullName}`);

    const orgPayload = {
      namaOrganisasi: resolvedOrgName,
      tipeOrganisasi: type,
      emailResmi: firebaseUser.email || "",
      website: "",
      nomorTelepon: "",
      alamat: { jalan: "", kota: "" },
      branding: { logoUrl: null, capStempelUrl: null },
      nomorSuratFormat: {
        prefix: type === "personal" ? "SERTI" : "SK-SERTI",
        kodeBagian: type === "personal" ? "IND" : "HRD",
      },
      pemilikId: firebaseUser.uid,
      dibuatPada: serverTimestamp(),
      diperbaruiPada: serverTimestamp(),
    };

    const newOrgRef = await addDoc(collection(db, "organizations"), orgPayload);
    const generatedOrgId = newOrgRef.id;

    const userPayload = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      namaLengkap: resolvedFullName,
      nomorWhatsapp: "",
      jabatan: type === "personal" ? "Penyelenggara Mandiri" : "Penanggung Jawab",
      accountType: type,
      activeOrgId: generatedOrgId,
      organizations: [
        {
          orgId: generatedOrgId,
          role: "owner",
          namaOrganisasi: resolvedOrgName,
        },
      ],
      dibuatPada: serverTimestamp(),
      terakhirLogin: serverTimestamp(),
    };

    await setDoc(userDocRef, userPayload);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password harus memiliki setidaknya 6 karakter.");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (namaLengkap.trim()) {
        await updateProfile(userCredential.user, {
          displayName: namaLengkap.trim(),
        });
      }

      await provisionUserAndOrg(
        userCredential.user,
        namaLengkap,
        namaOrganisasi,
        accountType
      );

      router.push("/dashboard");
    } catch (err) {
      console.error("Gagal mendaftar:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Alamat email ini sudah terdaftar. Silakan masuk.");
      } else if (err.code === "auth/invalid-email") {
        setError("Format alamat email tidak valid.");
      } else {
        setError("Gagal membuat akun: " + (err.message || "Terjadi kesalahan."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      await provisionUserAndOrg(
        result.user,
        result.user.displayName,
        namaOrganisasi,
        accountType
      );

      router.push("/dashboard");
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Gagal mendaftar dengan Google: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className={`${sansFont.variable} ${monoFont.variable} min-h-screen bg-[#FFFFFF] text-[#111111] flex flex-col justify-center items-center px-6 py-16 selection:bg-[#111111] selection:text-white font-sans antialiased`}
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      <div className="w-full max-w-[380px] space-y-8">
        <div className="space-y-2 text-left">
          <Link
            href="/"
            className="text-xs font-mono tracking-tight uppercase text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            SertiGen
          </Link>
          <h1 className="text-3xl font-light tracking-[-1px] text-[#111111]">
            Buat akun baru
          </h1>
          <p className="text-xs text-[#6B7280]">
            Pilih jenis akun untuk mulai mengelola dokumen sertifikat.
          </p>
        </div>

        {/* Tipe Penyelenggara */}
        <div className="space-y-2">
          <label className="block text-[11px] font-mono uppercase text-[#6B7280]">
            Tipe Penyelenggara
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F5F5F5] rounded-[4px] border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setAccountType("personal")}
              className={`py-1.5 text-xs font-mono uppercase rounded-[2px] transition-colors ${
                accountType === "personal"
                  ? "bg-[#111111] text-white"
                  : "text-[#6B7280] hover:text-[#111111]"
              }`}
            >
              Perorangan
            </button>
            <button
              type="button"
              onClick={() => setAccountType("organization")}
              className={`py-1.5 text-xs font-mono uppercase rounded-[2px] transition-colors ${
                accountType === "organization"
                  ? "bg-[#111111] text-white"
                  : "text-[#6B7280] hover:text-[#111111]"
              }`}
            >
              Instansi
            </button>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            {accountType === "personal"
              ? "Untuk instruktur, pelatih les, atau panitia mandiri."
              : "Untuk PT, CV, universitas, yayasan, atau organisasi formal."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 px-4 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] hover:bg-[#F5F5F5] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          <IconGoogle />
          <span>Daftar dengan Google</span>
        </button>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-[#E5E7EB]" />
          <span className="shrink mx-3 text-[#6B7280] text-[10px] font-mono uppercase tracking-wider">
            atau gunakan email
          </span>
          <div className="flex-grow border-t border-[#E5E7EB]" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full px-3 py-2 text-xs text-[#111111] border border-[#E5E7EB] rounded-[4px] bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
              {accountType === "organization"
                ? "Nama Lembaga / PT"
                : "Nama Ruang Kerja (Opsional)"}
            </label>
            <input
              type="text"
              required={accountType === "organization"}
              placeholder={
                accountType === "organization"
                  ? "Contoh: PT Teknologi Bangsa"
                  : "Contoh: Budi Studio"
              }
              value={namaOrganisasi}
              onChange={(e) => setNamaOrganisasi(e.target.value)}
              className="w-full px-3 py-2 text-xs text-[#111111] border border-[#E5E7EB] rounded-[4px] bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono text-[#111111] border border-[#E5E7EB] rounded-[4px] bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
              Password (Min. 6 Karakter)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#111111] border border-[#E5E7EB] rounded-[4px] bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors pr-9"
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
            <p className="text-[#D92D20] text-xs font-mono bg-[#F5F5F5] p-2.5 rounded-[4px] border border-[#E5E7EB]">
              [!] {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 text-xs font-mono uppercase text-white bg-[#111111] rounded-[4px] hover:bg-[#333333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mempersiapkan...</span>
              </>
            ) : (
              <span>Daftar Akun</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] font-mono pt-4 border-t border-[#E5E7EB]">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-[#111111] hover:underline">
            Login di sini
          </Link>
        </p>
      </div>
    </main>
  );
}