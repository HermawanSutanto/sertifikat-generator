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
    <div className="bg-[#EBE9E4] text-[#111111] min-h-screen">
      {/* Header Sederhana */}
      <header className="sticky top-0 z-50 w-full bg-[#EBE9E4]/95 backdrop-blur-sm border-b border-[#111111]">
        <div className="max-w-[1140px] mx-auto flex justify-between items-center px-6 md:px-12 py-4">
          <Link
            href="/"
            className="text-xl font-bold uppercase tracking-tight text-[#111111]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SERTIGEN.
          </Link>
          <Link
            href="/"
            className="text-[13px] font-mono uppercase tracking-wider text-[#555555] hover:text-[#0000EE] transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-[1140px] mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-[#0000EE]">
          Blog
        </div>
        <h1
          className="mt-3 text-4xl md:text-5xl font-bold text-[#111111] uppercase mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Blog & Artikel
        </h1>
        <p className="text-lg text-[#555555] mb-12 max-w-2xl">
          Temukan berbagai panduan, tips, dan inspirasi untuk membantu Anda
          membuat sertifikat yang profesional dan berkesan.
        </p>

        <div className="grid gap-6">
          {posts.map((post) => (
            <Link
              href={`/blog/${post.slug}`}
              key={post.slug}
              className="block p-8 rounded-[4px] transition-colors border border-[#111111] bg-[#FFFFFF] hover:bg-[#EBE9E4]"
            >
              <h2
                className="text-2xl font-bold text-[#111111] mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {post.title}
              </h2>
              <p className="text-xs font-mono uppercase tracking-wide text-[#555555] mb-4">
                {new Date(post.date).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
              <p className="text-[#555555]">{post.description}</p>
              <div className="text-[#0000EE] font-mono text-sm uppercase font-semibold mt-6 inline-flex items-center gap-1">
                Baca Selengkapnya →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
