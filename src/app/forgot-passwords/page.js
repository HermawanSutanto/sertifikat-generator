"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

const IconMailSend = (props) => (
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
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.25l7.5-4.5M4.5 6.75l7.5 4.5" />
  </svg>
);

const IconCheck = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25 4.5-4.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Silakan masukkan alamat email akun Anda.");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setIsSent(true);
      setResendCooldown(60);
    } catch (err) {
      console.error("Gagal mengirim email reset password:", err);
      if (err.code === "auth/user-not-found") {
        setError("Alamat email tidak ditemukan. Pastikan email terdaftar.");
      } else if (err.code === "auth/invalid-email") {
        setError("Format alamat email tidak valid.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Terlalu banyak percobaan. Harap tunggu beberapa saat.");
      } else {
        setError("Gagal mengirim tautan reset: " + (err.message || "Periksa koneksi Anda."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <main className="min-h-screen bg-[#FFFFFF] text-[#111111] flex flex-col justify-center items-center px-6 py-16 selection:bg-[#111111] selection:text-white font-sans antialiased">
        <div className="w-full max-w-[400px] bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg p-8 space-y-6 shadow-xs text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <IconCheck className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Tautan Terkirim
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111] pt-1">
              Periksa Inbox Email Anda
            </h1>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Petunjuk dan tautan untuk membuat kata sandi baru telah kami kirimkan ke:
            </p>
            <p className="text-sm font-semibold text-[#111111] bg-[#F9FAFB] py-2 px-3 rounded-md border border-[#E5E7EB] break-all">
              {email}
            </p>
          </div>

          <div className="text-xs text-[#6B7280] space-y-2 text-left bg-[#F9FAFB] p-4 rounded-md border border-[#E5E7EB]">
            <p className="font-semibold text-[#111111]">Langkah selanjutnya:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Buka kotak masuk atau folder <strong>Spam / Junk</strong> email Anda.</li>
              <li>Klik tautan atur ulang kata sandi dari <strong>SertiGen</strong>.</li>
              <li>Masukkan kata sandi baru Anda dan simpan.</li>
            </ol>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              {error}
            </p>
          )}

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resendCooldown > 0 || isLoading}
              className="w-full py-2.5 text-xs font-semibold rounded-md border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F9FAFB] transition-colors disabled:opacity-40"
            >
              {isLoading
                ? "Mengirim ulang..."
                : resendCooldown > 0
                ? `Kirim ulang tautan (${resendCooldown}s)`
                : "Kirim Ulang Tautan Reset"}
            </button>

            <Link
              href="/login"
              className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#111111] rounded-md hover:bg-[#333333] transition-colors inline-flex items-center justify-center"
            >
              Kembali ke Halaman Masuk
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#111111] flex flex-col justify-center items-center px-6 py-16 selection:bg-[#111111] selection:text-white font-sans antialiased">
      <div className="w-full max-w-[380px] space-y-8">
        <div className="space-y-2 text-left">
          <Link
            href="/login"
            className="text-xs font-medium tracking-tight uppercase text-[#6B7280] hover:text-[#111111] transition-colors inline-flex items-center gap-1.5"
          >
            ← Kembali ke Halaman Masuk
          </Link>
          <div className="w-10 h-10 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] text-[#111111] flex items-center justify-center mt-3">
            <IconMailSend className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111] pt-1">
            Lupa kata sandi?
          </h1>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Masukkan alamat email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi baru.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
              Email Terdaftar
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
                <span>Mengirim Tautan...</span>
              </>
            ) : (
              <span>Kirim Tautan Atur Ulang</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] pt-4 border-t border-[#E5E7EB]">
          Ingat kata sandi Anda?{" "}
          <Link href="/login" className="text-[#111111] font-semibold hover:underline">
            Masuk kembali
          </Link>
        </p>
      </div>
    </main>
  );
}