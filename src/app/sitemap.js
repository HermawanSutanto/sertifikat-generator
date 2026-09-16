// src/app/sitemap.js

export default function sitemap() {
  return [
    {
      url: "https://cert.krovida.my.id/", // Ganti dengan URL domain Anda
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1
    },
    {
      url: "https://cert.krovida.my.id//login", // Ganti dengan URL domain Anda
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: "https://cert.krovida.my.id//register", // Ganti dengan URL domain Anda
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    }
  ];
}
