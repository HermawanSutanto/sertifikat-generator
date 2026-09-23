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
            href="/blog"
            className="text-[13px] font-mono uppercase tracking-wider text-[#555555] hover:text-[#0000EE] transition-colors"
          >
            ← Kembali ke Blog
          </Link>
        </div>
      </header>

      {/* Konten Artikel */}
      <main className="max-w-[1140px] mx-auto px-6 md:px-12 py-12 md:py-20">
        <article className="prose lg:prose-xl max-w-4xl mx-auto prose-headings:text-[#111111] prose-a:text-[#0000EE]">
          <div className="mb-8 text-center">
            <h1
              className="text-4xl md:text-5xl font-bold text-[#111111] uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {post.metadata.title}
            </h1>
            <p className="text-sm font-mono uppercase tracking-wide text-[#555555] mt-4">
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
