"use client";
import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const auth = getAuth(app);

// Komponen Ikon Mata (Buka)
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

// Komponen Ikon Mata (Tutup)
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
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard"); // Redirect ke halaman dashboard setelah berhasil
    } catch (error) {
      setError("Email atau password yang Anda masukkan salah.");
      console.error("Error logging in:", error);
    }
  };

  return (
    <main className="relative flex items-center justify-center min-h-screen bg-[#EBE9E4] px-4">
      <div
        className="hidden md:block absolute right-16 top-16 w-24 h-24 rounded-full border-2 border-[#111111]/10"
        aria-hidden="true"
      />
      <div
        className="hidden md:block absolute left-16 bottom-16 w-32 h-32 rounded-full border border-dashed border-[#111111]/10"
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

      <div className="relative w-full max-w-md p-10 space-y-8 bg-[#FFFFFF] rounded-[4px] shadow-2xl border border-[#111111]">
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/"
            className="text-lg font-bold uppercase tracking-tight text-[#111111]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SERTIGEN.
          </Link>
          <h1
            className="text-3xl font-bold text-center text-[#111111] uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Selamat Datang Kembali
          </h1>
          <p className="text-sm text-[#555555] text-center font-mono">
            Masuk untuk melanjutkan membuat sertifikat Anda.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wide text-[#111111] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border text-[#111111] border-[#111111]/20 bg-white rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0000EE]/50 focus:border-[#0000EE] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wide text-[#111111] mb-2">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border text-[#111111] border-[#111111]/20 bg-white rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0000EE]/50 focus:border-[#0000EE] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-[#111111]/50 hover:text-[#111111]"
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-[#B3261E] text-sm font-semibold text-center font-mono">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3.5 font-mono font-semibold uppercase tracking-wide text-white bg-[#111111] rounded-[4px] hover:bg-[#0000EE] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
          >
            Login
          </button>
        </form>
        <p className="text-center text-sm text-[#555555] font-mono">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-[#0000EE] hover:underline">
            Register di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
