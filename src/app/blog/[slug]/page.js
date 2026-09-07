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
            href="/blog"
            className="px-5 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            ← Kembali ke Blog
          </Link>
        </div>
      </header>

      {/* Konten Artikel */}
      <main className="container mx-auto px-6 py-12 md:py-20">
        <article className="prose lg:prose-xl max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">
              {post.metadata.title}
            </h1>
            <p className="text-lg text-gray-500 mt-4">
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
