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
    <div className="bg-[#F2EAD3] text-[#17233D] min-h-screen">
      {/* Header Sederhana */}
      <header className="sticky top-0 z-50 w-full bg-[#F2EAD3]/90 backdrop-blur-md border-b border-[#17233D]/10">
        <div className="max-w-[1140px] mx-auto flex justify-between items-center px-6 md:px-12 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#A9822E] text-[#A9822E] text-xs font-bold">
              SG
            </span>
            <span
              className="text-xl font-bold text-[#17233D] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SertiGen
            </span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-[#17233D] rounded-full hover:bg-[#17233D]/[0.06] transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-[1140px] mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
          Blog
        </div>
        <h1
          className="mt-3 text-4xl md:text-5xl font-bold text-[#17233D] mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Blog & Artikel
        </h1>
        <p className="text-lg text-[#17233D]/70 mb-12 max-w-2xl">
          Temukan berbagai panduan, tips, dan inspirasi untuk membantu Anda
          membuat sertifikat yang profesional dan berkesan.
        </p>

        <div className="grid gap-6">
          {posts.map((post) => (
            <Link
              href={`/blog/${post.slug}`}
              key={post.slug}
              className="block p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-[#17233D]/10 bg-[#FCFAF2]"
            >
              <h2
                className="text-2xl font-bold text-[#17233D] mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {post.title}
              </h2>
              <p className="text-sm text-[#17233D]/50 mb-4">
                {new Date(post.date).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
              <p className="text-[#17233D]/70">{post.description}</p>
              <div className="text-[#8C2F39] font-semibold mt-6 inline-flex items-center gap-1">
                Baca Selengkapnya →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
