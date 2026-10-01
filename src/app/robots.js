// src/app/robots.js

import { MetadataRoute } from "next";

export default function robots() {
  const baseUrl = "https://cert.krovida.my.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}