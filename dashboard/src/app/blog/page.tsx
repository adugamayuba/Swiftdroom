import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BlogCard } from "@/components/marketing/BlogCard";
import { BLOG_POSTS } from "@/lib/blog-posts";

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-white text-[var(--brand-header)]">
      <MarketingHeader />

      <main>
        <section className="bg-[var(--brand-mint)] py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--brand-header)]/55 transition hover:text-[var(--brand-header)]"
            >
              ← Back to home
            </Link>
            <span className="al-section-tag mt-6">Blog</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--brand-header)] md:text-5xl">
              Job search, decoded
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[var(--brand-header)]/65">
              Practical guides on applying faster, writing better answers, and landing
              interviews in 2026.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
