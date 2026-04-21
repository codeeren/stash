import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownViewProps = {
  content: string;
};

export function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <div
      className={[
        "text-sm bg-muted rounded-md p-4",
        "prose prose-sm max-w-none dark:prose-invert",
        // tighten defaults
        "prose-headings:mt-3 prose-headings:mb-2",
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
        "prose-pre:bg-background prose-pre:text-foreground prose-pre:border",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
        "prose-a:text-primary prose-a:underline",
        "prose-hr:my-3",
        "break-words",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
