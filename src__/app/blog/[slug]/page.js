// src/app/blog/[slug]/page.js

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import Link from "next/link";

// Fungsi untuk mengambil data satu post
async function getPost(slug) {
  const postsDirectory = path.join(process.cwd(), "posts");
  const filePath = path.join(postsDirectory, `${slug}.mdx`);
  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContents);
    return { metadata: data, content };
  } catch (error) {
    return null; // Post tidak ditemukan
  }
}

// Fungsi untuk generate metadata SEO dinamis
export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  if (!post) {
    return { title: "Artikel Tidak Ditemukan" };
  }
  return {
    title: `${post.metadata.title} | SertiGen`,
    description: post.metadata.description
  };
}

// Komponen utama halaman post
export default async function PostPage({ params }) {
  const post = await getPost(params.slug);

  if (!post) {
    return <div>Artikel tidak ditemukan.</div>;
  }

  const { content } = await compileMDX({
    source: post.content
  });

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
            href="/blog"
            className="px-4 py-2 text-sm font-medium text-[#17233D] rounded-full hover:bg-[#17233D]/[0.06] transition-colors"
          >
            ← Kembali ke Blog
          </Link>
        </div>
      </header>

      {/* Konten Artikel */}
      <main className="max-w-[1140px] mx-auto px-6 md:px-12 py-12 md:py-20">
        <article className="prose lg:prose-xl max-w-4xl mx-auto prose-headings:text-[#17233D] prose-a:text-[#8C2F39]">
          <div className="mb-8 text-center">
            <h1
              className="text-4xl md:text-5xl font-bold text-[#17233D]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {post.metadata.title}
            </h1>
            <p className="text-lg text-[#17233D]/50 mt-4">
              {new Date(post.metadata.date).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
          {content}
        </article>
      </main>
    </div>
  );
}
