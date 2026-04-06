import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";

export function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-6 text-base leading-8 text-slate-600">
    <Markdown
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl font-extrabold text-slate-900">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold text-slate-900">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-bold text-slate-900">{children}</h3>
        ),
        p: ({ children }) => <p>{children}</p>,
        strong: ({ children }) => <strong>{children}</strong>,
        ul: ({ children }) => (
          <ul className="list-disc space-y-2 pl-6 marker:text-primary">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal space-y-2 pl-6 marker:text-primary">{children}</ol>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="font-medium text-primary underline underline-offset-4"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/30 pl-4 italic text-slate-500">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-slate-200" />,
      }}
    >
      {markdown}
    </Markdown>
    </div>
  );
}
