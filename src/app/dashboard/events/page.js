"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EventsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Arahkan langsung ke dashboard utama yang sudah memuat daftar event
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-mono text-xs text-gray-500 space-y-2">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p>Mengalihkan ke Dashboard Utama...</p>
    </div>
  );
}