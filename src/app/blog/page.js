// src/app/blog/page.js

import Link from "next/link";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const metadata = {
  title: "Blog SertiGen - Tips & Trik Seputar Sertifikat",
  description:
    "Kumpulan artikel, panduan, dan inspirasi seputar desain, pembuatan, dan manajemen sertifikat untuk berbagai acara."
};

// Fungsi untuk mengambil semua postingan
async function getPosts() {
  const postsDirectory = path.join(process.cwd(), "posts");
  const filenames = fs.readdirSync(postsDirectory);

  const posts = filenames.map((filename) => {
    const slug = filename.replace(".mdx", "");
    const filePath = path.join(postsDirectory, filename);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContents);

    return {
      slug,
      ...data
    };
  });

  // Urutkan post berdasarkan tanggal terbaru
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default async function BlogIndex() {
  const posts = await getPosts();

  return (
    <div className="bg-white text-slate-800">
      {/* Header Sederhana */}
      <header className="w-full bg-white/70 backdrop-blur-md shadow-sm z-50">
        <div className="container mx-auto flex justify-between items-center px-6 py-4">
          <Link
            href="/"
            className="text-2xl font-extrabold text-indigo-600 tracking-tight"
          >
            SertiGen
          </Link>
          <Link
            href="/"
            className="px-5 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="container mx-auto px-6 py-12 md:py-20">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
          Blog & Artikel
        </h1>
        <p className="text-lg text-gray-600 mb-12 max-w-2xl">
          Temukan berbagai panduan, tips, dan inspirasi untuk membantu Anda
          membuat sertifikat yang profesional dan berkesan.
        </p>

        <div className="grid gap-8">
          {posts.map((post) => (
            <Link
              href={`/blog/${post.slug}`}
              key={post.slug}
              className="block p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 bg-slate-50"
            >
              <h2 className="text-2xl font-bold text-indigo-700 mb-2">
                {post.title}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(post.date).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
              <p className="text-gray-600">{post.description}</p>
              <div className="text-indigo-600 font-semibold mt-6 inline-block">
                Baca Selengkapnya →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
