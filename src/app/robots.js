// src/app/robots.js

import { MetadataRoute } from "next";

export default function robots() {
  return {
    rules: {
      userAgent: "*", // Berlaku untuk semua robot
      allow: "/", // Izinkan semua halaman di-crawl
      disallow: "/dashboard/", // JANGAN izinkan halaman dashboard di-crawl
    },
    sitemap: "https://cert.krovida.my.id/sitemap.xml", // Ganti dengan URL domain Anda
  };
}