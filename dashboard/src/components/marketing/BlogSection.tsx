import Link from "next/link";
import { ArrowRight } from "lucide-react";

const POSTS = [
  {
    slug: "workday-autofill-guide",
    category: "Guides",
    title: "How to autofill Workday applications without losing your mind",
    excerpt:
      "Workday forms are notoriously painful. Here is exactly how label-based detection beats browser autofill every time.",
    date: "May 28, 2026",
    readTime: "6 min read",
  },
  {
    slug: "ai-cover-letter-tips",
    category: "AI",
    title: "Writing better open-ended answers with your resume as context",
    excerpt:
      "Generic AI answers get ignored. Learn how to generate responses that actually reference your experience and the job description.",
    date: "May 22, 2026",
    readTime: "4 min read",
  },
  {
    slug: "job-search-2026",
    category: "Career",
    title: "The 2026 job search playbook: volume vs. quality",
    excerpt:
      "Should you apply to 100 roles or 20 tailored ones? Data from 500+ Swiftdroom users on what actually moves the needle.",
    date: "May 15, 2026",
    readTime: "8 min read",
  },
];

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
            href="#blog"
            className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-900 hover:underline"
          >
            View all posts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {POSTS.map(({ slug, category, title, excerpt, date, readTime }) => (
            <article
              key={slug}
              className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-medium text-neutral-700">
                  {category}
                </span>
                <span>{date}</span>
                <span>·</span>
                <span>{readTime}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold leading-snug text-neutral-950 group-hover:underline">
                {title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-600">
                {excerpt}
              </p>
              <Link
                href="#blog"
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-neutral-900"
              >
                Read more
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
