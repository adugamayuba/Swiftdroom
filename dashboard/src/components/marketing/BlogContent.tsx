import type { BlogContentBlock } from "@/lib/blog-posts";

function Block({ block }: { block: BlogContentBlock }) {
  switch (block.type) {
    case "heading":
      if (block.level === 2) {
        return (
          <h2 className="mt-10 font-serif text-2xl font-normal tracking-tight text-[var(--al-black)] first:mt-0">
            {block.text}
          </h2>
        );
      }
      return (
        <h3 className="mt-8 text-lg font-semibold text-[var(--al-black)]">
          {block.text}
        </h3>
      );
    case "paragraph":
      return (
        <p className="mt-4 text-base leading-relaxed text-[var(--al-muted)]">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-[var(--al-muted)]">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="mt-6 border-l-4 border-[var(--al-green)] pl-5">
          <p className="font-serif text-lg italic leading-relaxed text-[var(--al-black)]">
            &ldquo;{block.text}&rdquo;
          </p>
          {block.attribution && (
            <footer className="mt-2 text-sm text-[var(--al-muted)]">
              — {block.attribution}
            </footer>
          )}
        </blockquote>
      );
  }
}

export function BlogContent({ blocks }: { blocks: BlogContentBlock[] }) {
  return (
    <div className="blog-content">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
