import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BlogCard } from "@/components/marketing/BlogCard";
import { BLOG_POSTS } from "@/lib/blog-posts";

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      <main>
        <section className="border-b border-neutral-200 bg-neutral-50 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Link
              href="/"
              className="text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
            >
              ← Back to home
            </Link>
            <p className="mt-6 text-sm font-medium uppercase tracking-widest text-neutral-400">
              Blog
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-neutral-950 md:text-5xl">
              Job search, decoded
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-neutral-600">
              Practical guides on applying faster, writing better answers, and landing
              interviews in 2026.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {BLOG_POSTS.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
