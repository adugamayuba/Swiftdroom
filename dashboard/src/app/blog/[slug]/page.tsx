import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BlogContent } from "@/components/marketing/BlogContent";
import { BlogCard } from "@/components/marketing/BlogCard";
import {
  BLOG_POSTS,
  getAllBlogSlugs,
  getBlogPost,
} from "@/lib/blog-posts";
import { buildPageMetadata, SITE_NAME } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    ...buildPageMetadata({
      title: post.title,
      description: post.excerpt,
      path: `/blog/${slug}`,
    }),
    openGraph: {
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author],
      section: post.category,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const related = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-white text-[var(--brand-header)]">
      <MarketingHeader />

      <main>
        <article>
          <header className="bg-[var(--brand-mint)] py-12 md:py-16">
            <div className="mx-auto max-w-3xl px-6">
              <Link
                href="/blog"
                className="text-sm font-medium text-[var(--brand-header)]/55 transition hover:text-[var(--brand-header)]"
              >
                ← All posts
              </Link>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-[var(--brand-header)]/55">
                <span className="rounded-sm bg-white/70 px-2.5 py-0.5 font-medium text-[var(--brand-header)]">
                  {post.category}
                </span>
                <span>{post.date}</span>
                <span>·</span>
                <span>{post.readTime}</span>
                <span>·</span>
                <span>{post.author}</span>
              </div>
              <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-[var(--brand-header)] md:text-4xl md:leading-tight">
                {post.title}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-[var(--brand-header)]/65">
                {post.excerpt}
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
            <BlogContent blocks={post.content} />
          </div>
        </article>

        <section className="border-t border-[var(--border)] bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--brand-header)]">
              More from {SITE_NAME}
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {related.map((relatedPost) => (
                <BlogCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--brand-dark)] py-16 text-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to apply faster?
            </h2>
            <p className="mt-3 text-white/60">
              Set up your profile once and let Swiftdroom handle the repetitive work.
            </p>
            <Link href="/register" className="al-btn-white mt-6">
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
