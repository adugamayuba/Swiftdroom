import Link from "next/link";
import type { BlogPost } from "@/lib/blog-posts";

const CATEGORY_GRADIENTS: Record<string, string> = {
  Guides: "from-[#1a3d5c] to-[#2d5a7b]",
  AI: "from-[#3d2d5c] to-[#5c4a7b]",
  Career: "from-[#2d4a3d] to-[#4a6b5c]",
};

export function BlogCard({ post }: { post: BlogPost }) {
  const { slug, category, title, excerpt, date, readTime } = post;
  const gradient = CATEGORY_GRADIENTS[category] ?? "from-[var(--brand-dark)] to-[var(--brand-dark-elevated)]";

  return (
    <article className="group flex flex-col">
      <Link href={`/blog/${slug}`} className="block overflow-hidden rounded-lg">
        <div
          className={`aspect-[16/10] w-full bg-gradient-to-br ${gradient}`}
          aria-hidden
        />
      </Link>
      <div className="mt-4 flex flex-col flex-1">
        <span className="inline-block w-fit rounded-sm bg-neutral-100 px-2 py-0.5 text-xs font-medium text-[var(--brand-header)]">
          {category}
        </span>
        <h2 className="mt-3 text-lg font-semibold leading-snug text-[var(--brand-header)] group-hover:underline">
          <Link href={`/blog/${slug}`}>{title}</Link>
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--brand-header)]/60 line-clamp-2">
          {excerpt}
        </p>
        <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-wider text-[var(--brand-header)]/45">
          {date} — {readTime}
        </p>
      </div>
    </article>
  );
}
