import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { BlogCard } from "@/components/marketing/BlogCard";

export function BlogSection() {
  return (
    <section id="blog" className="border-b border-neutral-200 bg-neutral-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">
              Blog
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950 md:text-4xl">
              Job search, decoded
            </h2>
            <p className="mt-4 max-w-lg text-neutral-600">
              Practical guides on applying faster, writing better answers, and landing interviews.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-900 hover:underline"
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
