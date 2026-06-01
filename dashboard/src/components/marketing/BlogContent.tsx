import type { BlogContentBlock } from "@/lib/blog-posts";

function Block({ block }: { block: BlogContentBlock }) {
  switch (block.type) {
    case "heading":
      if (block.level === 2) {
        return (
          <h2 className="mt-10 text-2xl font-bold tracking-tight text-neutral-950 first:mt-0">
            {block.text}
          </h2>
        );
      }
      return (
        <h3 className="mt-8 text-lg font-semibold text-neutral-900">
          {block.text}
        </h3>
      );
    case "paragraph":
      return (
        <p className="mt-4 text-base leading-relaxed text-neutral-700">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-neutral-700">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="mt-6 border-l-4 border-neutral-300 pl-5">
          <p className="text-base italic leading-relaxed text-neutral-700">
            &ldquo;{block.text}&rdquo;
          </p>
          {block.attribution && (
            <footer className="mt-2 text-sm text-neutral-500">
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
