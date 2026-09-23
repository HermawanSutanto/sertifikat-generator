"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// URL /dashboard/cetak-lokal sudah tidak dipakai lagi — kontennya sekarang
// jadi /dashboard itu sendiri. Halaman ini hanya menjaga kompatibilitas
// untuk bookmark/tautan lama supaya tidak 404, lalu langsung redirect.
export default function CetakLokalRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
