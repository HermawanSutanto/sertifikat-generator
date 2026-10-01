"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
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

const IconMailCheck = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25 4.5-4.5" />
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

  // State Verifikasi Link Email
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState("");
  const [isResending, setIsResending] = useState(false);

  const router = useRouter();

  // Pengatur hitung mundur tombol kirim ulang
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
      // 1. Buat akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (namaLengkap.trim()) {
        await updateProfile(userCredential.user, {
          displayName: namaLengkap.trim(),
        });
      }

      // 2. Siapkan data organisasi & profil di Firestore
      await provisionUserAndOrg(
        userCredential.user,
        namaLengkap,
        namaOrganisasi,
        accountType
      );

      // 3. Kirim link verifikasi resmi dari Firebase ke inbox pengguna
      await sendEmailVerification(userCredential.user);

      // Simpan user object untuk keperluan kirim ulang
      setRegisteredUser(userCredential.user);
      setIsVerificationSent(true);
      setResendCooldown(60);
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

  const handleResendVerification = async () => {
    if (!registeredUser || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendNotice("");
    setError("");

    try {
      await sendEmailVerification(registeredUser);
      setResendNotice("Tautan verifikasi baru berhasil dikirim ulang ke email Anda.");
      setResendCooldown(60);
    } catch (err) {
      console.error("Gagal mengirim ulang email:", err);
      setError("Gagal mengirim ulang email verifikasi. Coba beberapa saat lagi.");
    } finally {
      setIsResending(false);
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

      // Email via akun Google sudah terverifikasi otomatis oleh Google
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

  // LAYAR KONFIRMASI PENGIRIMAN LINK VERIFIKASI
  if (isVerificationSent) {
    return (
      <main className="min-h-screen bg-[#FFFFFF] text-[#111111] flex flex-col justify-center items-center px-6 py-16 font-sans antialiased">
        <div className="w-full max-w-[420px] bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg p-8 space-y-6 shadow-xs text-center">
          <div className="flex justify-start">
            <Link
              href="/"
              className="text-xs text-[#6B7280] hover:text-[#111111] transition-colors inline-flex items-center gap-1.5"
            >
              ← Kembali ke Beranda
            </Link>
          </div>

          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <IconMailCheck className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Tautan Verifikasi Dikirim
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111] pt-2">
              Periksa Inbox Email Anda
            </h1>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Kami telah mengirimkan tautan aktivasi akun ke:
            </p>
            <p className="text-sm font-semibold text-[#111111] bg-[#F9FAFB] py-2 px-3 rounded-md border border-[#E5E7EB] break-all">
              {email}
            </p>
          </div>

          <div className="text-xs text-[#6B7280] space-y-2 text-left bg-[#F9FAFB] p-4 rounded-md border border-[#E5E7EB]">
            <p className="font-semibold text-[#111111]">Langkah selanjutnya:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Buka inbox atau folder <strong>Spam / Junk</strong> email Anda.</li>
              <li>Klik tautan verifikasi dari <strong>Firebase / SertiGen</strong>.</li>
              <li>Akun Anda akan otomatis terverifikasi dan siap digunakan.</li>
            </ol>
          </div>

          {resendNotice && (
            <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-200">
              {resendNotice}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              {error}
            </p>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendCooldown > 0 || isResending}
              className="w-full py-2.5 text-xs font-semibold rounded-md border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F9FAFB] transition-colors disabled:opacity-40"
            >
              {isResending
                ? "Mengirim ulang..."
                : resendCooldown > 0
                ? `Kirim ulang email (${resendCooldown}s)`
                : "Kirim Ulang Tautan Verifikasi"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#111111] rounded-md hover:bg-[#333333] transition-colors"
            >
              Lanjutkan ke Dashboard →
            </button>

            <Link
              href="/"
              className="w-full py-2.5 text-xs font-semibold rounded-md border border-[#E5E7EB] text-[#4B5563] hover:text-[#111111] hover:bg-[#F9FAFB] transition-colors inline-flex items-center justify-center gap-1.5"
            >
              ← Kembali ke Halaman Utama
            </Link>
          </div>

          <p className="text-xs text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
            Salah memasukkan alamat email?{" "}
            <button
              type="button"
              onClick={() => {
                setIsVerificationSent(false);
                setRegisteredUser(null);
              }}
              className="text-[#111111] font-semibold hover:underline"
            >
              Daftar ulang
            </button>
          </p>
        </div>
      </main>
    );
  }

  // FORMULIR REGISTER UTAMA
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
            Buat akun baru
          </h1>
          <p className="text-xs text-[#6B7280]">
            Pilih jenis akun untuk mulai mengelola dokumen sertifikat.
          </p>
        </div>

        {/* Tipe Penyelenggara */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
            Tipe Penyelenggara
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F3F4F6] rounded-md border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setAccountType("personal")}
              className={`py-1.5 text-xs font-semibold uppercase rounded transition-colors ${
                accountType === "personal"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111]"
              }`}
            >
              Perorangan
            </button>
            <button
              type="button"
              onClick={() => setAccountType("organization")}
              className={`py-1.5 text-xs font-semibold uppercase rounded transition-colors ${
                accountType === "organization"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111]"
              }`}
            >
              Instansi
            </button>
          </div>
          <p className="text-xs text-[#6B7280]">
            {accountType === "personal"
              ? "Untuk instruktur, pelatih les, atau panitia mandiri."
              : "Untuk PT, CV, universitas, yayasan, atau organisasi formal."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-wider rounded-md border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] hover:bg-[#F9FAFB] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          <IconGoogle />
          <span>Daftar dengan Google</span>
        </button>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-[#E5E7EB]" />
          <span className="shrink mx-3 text-[#6B7280] text-xs uppercase tracking-wider">
            atau gunakan email
          </span>
          <div className="flex-grow border-t border-[#E5E7EB]" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full px-3 py-2 text-xs text-[#111111] border border-[#E5E7EB] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
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
              className="w-full px-3 py-2 text-xs text-[#111111] border border-[#E5E7EB] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
              Email Pribadi / Lembaga
            </label>
            <input
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs text-[#111111] border border-[#E5E7EB] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#111111] transition-colors"
            />
            <span className="text-[11px] text-[#6B7280] mt-1 block">
              Tautan verifikasi akan dikirimkan ke alamat email ini.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
              Password (Min. 6 Karakter)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                <span>Mendaftarkan & Mengirim Email...</span>
              </>
            ) : (
              <span>Daftar & Kirim Tautan Verifikasi</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] pt-4 border-t border-[#E5E7EB]">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-[#111111] font-semibold hover:underline">
            Login di sini
          </Link>
        </p>
      </div>
    </main>
  );
}