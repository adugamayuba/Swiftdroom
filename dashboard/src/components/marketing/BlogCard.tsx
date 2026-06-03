import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog-posts";

export function BlogCard({ post }: { post: BlogPost }) {
  const { slug, category, title, excerpt, date, readTime } = post;

  return (
    <article className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-sm">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-medium text-neutral-700">
          {category}
        </span>
        <span>{date}</span>
        <span>·</span>
        <span>{readTime}</span>
      </div>
      <h2 className="mt-4 text-lg font-bold leading-snug text-neutral-950 group-hover:underline">
        <Link href={`/blog/${slug}`}>{title}</Link>
      </h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-600">
        {excerpt}
      </p>
      <Link
        href={`/blog/${slug}`}
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-neutral-900"
      >
        Read more
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}
