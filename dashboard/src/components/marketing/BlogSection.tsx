import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { BlogCard } from "@/components/marketing/BlogCard";
import { SectionLabel, SectionTitle } from "@/components/marketing/marketing-ui";

export function BlogSection() {
  return (
    <section id="blog" className="border-b border-[var(--al-border)] bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel>Resources</SectionLabel>
            <SectionTitle className="mt-3">Latest articles</SectionTitle>
            <p className="mt-4 max-w-lg text-[var(--al-muted)]">
              Practical guides on applying faster, writing better answers, and landing interviews.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--al-black)] hover:underline"
          >
            View all posts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
