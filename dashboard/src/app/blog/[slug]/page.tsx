import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BlogContent } from "@/components/marketing/BlogContent";
import { BlogCard } from "@/components/marketing/BlogCard";
import { BtnPrimary } from "@/components/marketing/marketing-ui";
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
    <div className="min-h-screen bg-white text-[var(--al-black)]">
      <MarketingHeader />

      <main>
        <article>
          <header className="border-b border-[var(--al-border)] bg-[var(--al-surface)] py-12 md:py-16">
            <div className="mx-auto max-w-3xl px-6">
              <Link
                href="/blog"
                className="text-sm font-medium text-[var(--al-muted)] transition hover:text-[var(--al-black)]"
              >
                ← All posts
              </Link>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-[var(--al-muted)]">
                <span className="font-medium text-[var(--al-black)]">{post.category}</span>
                <span>·</span>
                <span>{post.date}</span>
                <span>·</span>
                <span>{post.readTime}</span>
                <span>·</span>
                <span>{post.author}</span>
              </div>
              <h1 className="mt-5 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--al-black)] md:text-4xl md:leading-tight">
                {post.title}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-[var(--al-muted)]">
                {post.excerpt}
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
            <BlogContent blocks={post.content} />
          </div>
        </article>

        <section className="border-t border-[var(--al-border)] bg-[var(--al-surface)] py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-serif text-2xl font-normal text-[var(--al-black)]">
              More from {SITE_NAME}
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {related.map((relatedPost) => (
                <BlogCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--al-black)] py-16 text-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-serif text-2xl font-normal tracking-tight md:text-3xl">
              Ready to apply faster?
            </h2>
            <p className="mt-3 text-neutral-400">
              Set up your profile once and let Swiftdroom handle the repetitive work.
            </p>
            <div className="mt-6 flex justify-center">
              <BtnPrimary href="/register" className="!bg-white !text-[var(--al-black)] hover:!bg-neutral-100">
                Get started
              </BtnPrimary>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
