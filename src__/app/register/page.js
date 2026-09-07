"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

const EyeIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
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
    width="20"
    height="20"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M12 7c2.76 0 5 2.24 5 5c0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28l.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22L21 20.73L3.27 3L2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65c0 1.66 1.34 3 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53c-2.76 0-5-2.24-5-5c0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15l.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
    />
  </svg>
);

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password harus memiliki setidaknya 6 karakter.");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/dashboard"); // Redirect ke dashboard setelah berhasil
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Alamat email ini sudah terdaftar.");
      } else {
        setError("Gagal membuat akun. Silakan coba lagi.");
      }
      console.error(err);
    }
  };

  return (
    <main className="relative flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top,_#FBF3DB,_#F2EAD3)] px-4">
      <div
        className="hidden md:block absolute right-16 top-16 w-24 h-24 rounded-full border-2 border-[#A9822E]/40"
        aria-hidden="true"
      />
      <div
        className="hidden md:block absolute left-16 bottom-16 w-32 h-32 rounded-full border border-dashed border-[#A9822E]/40"
        aria-hidden="true"
      />

      <Link
        href="/"
        title="Kembali ke Beranda"
        className="absolute top-6 left-6 flex items-center justify-center w-10 h-10 rounded-full text-[#17233D] hover:bg-[#17233D]/[0.06] transition-colors"
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

      <div className="relative w-full max-w-md p-10 space-y-8 bg-[#FCFAF2] rounded-3xl shadow-2xl border border-[#A9822E]/30">
        <div className="flex flex-col items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-[#A9822E] text-[#A9822E] text-xs font-bold">
            SG
          </span>
          <h1
            className="text-3xl font-bold text-center text-[#17233D]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Buat Akun Baru
          </h1>
          <p className="text-sm text-[#17233D]/60 text-center">
            Gratis untuk 50 sertifikat pertama. Tanpa kartu kredit.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#17233D] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border text-[#17233D] border-[#17233D]/15 bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8C2F39]/50 focus:border-[#8C2F39] transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#17233D] mb-2">
              Password
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border text-[#17233D] border-[#17233D]/15 bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8C2F39]/50 focus:border-[#8C2F39] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-[#17233D]/50 hover:text-[#17233D]"
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-[#8C2F39] text-sm font-semibold text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3.5 font-semibold text-[#F2EAD3] bg-[#8C2F39] rounded-full shadow-lg hover:bg-[#742531] transition-colors"
          >
            Daftar Gratis
          </button>
        </form>
        <p className="text-center text-sm text-[#17233D]/70">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-[#8C2F39] hover:underline">
            Login di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
