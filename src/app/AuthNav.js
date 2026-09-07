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
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium text-[#17233D] rounded-full hover:bg-[#17233D]/[0.06] transition-colors"
        >
          Dashboard
        </Link>
        <button
          onClick={handleLogout}
          className="px-5 py-2 text-sm font-semibold text-[#F2EAD3] bg-[#17233D] rounded-full hover:bg-[#0F1830] transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="px-4 py-2 text-sm font-medium text-[#17233D] rounded-full hover:bg-[#17233D]/[0.06] transition-colors"
      >
        Masuk
      </Link>
      <Link
        href="/register"
        className="px-5 py-2 text-sm font-semibold text-[#F2EAD3] bg-[#8C2F39] rounded-full shadow-md hover:bg-[#742531] transition-colors"
      >
        Daftar Gratis
      </Link>
    </div>
  );
}