"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export default function AuthNav() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Gagal melakukan logout:", error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-[13px] font-mono uppercase tracking-wider text-[#555555] hover:text-[#0000EE] transition-colors"
        >
          Dashboard
        </Link>
        <button
          onClick={handleLogout}
          className="px-5 py-2.5 text-xs font-mono font-semibold uppercase tracking-wide text-white bg-[#111111] rounded-[4px] hover:bg-[#0000EE] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/login"
        className="text-[13px] font-mono uppercase tracking-wider text-[#555555] hover:text-[#0000EE] transition-colors"
      >
        Masuk
      </Link>
      <Link
        href="/register"
        className="px-5 py-2.5 text-xs font-mono font-semibold uppercase tracking-wide text-white bg-[#111111] rounded-[4px] hover:bg-[#0000EE] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
      >
        Daftar Gratis
      </Link>
    </div>
  );
}