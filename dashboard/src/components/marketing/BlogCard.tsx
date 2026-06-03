import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog-posts";

export function BlogCard({ post }: { post: BlogPost }) {
  const { slug, category, title, excerpt, date, readTime } = post;

  return (
    <article className="group flex flex-col border-b border-[var(--al-border)] pb-6 transition hover:border-[var(--al-black)]">
      <div className="flex items-center gap-2 text-xs text-[var(--al-muted)]">
        <span className="font-medium text-[var(--al-black)]">{category}</span>
        <span>·</span>
        <span>{date}</span>
        <span>·</span>
        <span>{readTime}</span>
      </div>
      <h2 className="mt-3 font-serif text-xl leading-snug text-[var(--al-black)] group-hover:underline">
        <Link href={`/blog/${slug}`}>{title}</Link>
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--al-muted)]">
        {excerpt}
      </p>
      <Link
        href={`/blog/${slug}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--al-green)]"
      >
        Read more
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}
