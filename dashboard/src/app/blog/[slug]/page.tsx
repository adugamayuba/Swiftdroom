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
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      <main>
        <article>
          <header className="border-b border-neutral-200 bg-neutral-50 py-12 md:py-16">
            <div className="mx-auto max-w-3xl px-6">
              <Link
                href="/blog"
                className="text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
              >
                ← All posts
              </Link>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 font-medium text-neutral-700">
                  {post.category}
                </span>
                <span>{post.date}</span>
                <span>·</span>
                <span>{post.readTime}</span>
                <span>·</span>
                <span>{post.author}</span>
              </div>
              <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-neutral-950 md:text-4xl md:leading-tight">
                {post.title}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-neutral-600">
                {post.excerpt}
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
            <BlogContent blocks={post.content} />
          </div>
        </article>

        <section className="border-t border-neutral-200 bg-neutral-50 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-bold tracking-tight text-neutral-950">
              More from {SITE_NAME}
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {related.map((relatedPost) => (
                <BlogCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-neutral-900 py-16 text-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to apply faster?
            </h2>
            <p className="mt-3 text-neutral-400">
              Set up your profile once and let Swiftdroom handle the repetitive work.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-block rounded-md bg-white px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
