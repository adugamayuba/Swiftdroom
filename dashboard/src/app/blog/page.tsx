import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BlogCard } from "@/components/marketing/BlogCard";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { SectionLabel, SectionTitle } from "@/components/marketing/marketing-ui";

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-white text-[var(--al-black)]">
      <MarketingHeader />

      <main>
        <section className="border-b border-[var(--al-border)] bg-[var(--al-surface)] py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--al-muted)] transition hover:text-[var(--al-black)]"
            >
              ← Back to home
            </Link>
            <SectionLabel>Blog</SectionLabel>
            <SectionTitle className="mt-3">Latest articles</SectionTitle>
            <p className="mt-4 max-w-2xl text-lg text-[var(--al-muted)]">
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
