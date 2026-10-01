// src/app/sitemap.js

export default async function sitemap() {
  const baseUrl = "https://cert.krovida.my.id";

  const routes = ["", "/trial", "/login", "/register"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));

  return [...routes];
}