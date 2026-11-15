import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";

/**
 * Renders markdown, with relative links and images resolved against `baseUrl`.
 *
 * `trusted` decides whether raw HTML inside the markdown is rendered. Proposal
 * source files come from the reviewed repositories and use HTML for tables and
 * figures, so they are trusted. Pull request and issue bodies are written by
 * anyone on GitHub: pass `trusted={false}` and their HTML is shown as text.
 */
export function MarkdownContent({ content, baseUrl, trusted = true }: { content: string; baseUrl?: string; trusted?: boolean }) {
  const urlTransform = (url: string) => {
    if (/^(https?:|#|mailto:)/i.test(url)) return url;
    if (trusted && /^data:image\//i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return ""; // any other scheme (javascript:, data:, vbscript:) is dropped
    if (baseUrl) {
      try {
        return new URL(url, baseUrl).toString();
      } catch {
        return url;
      }
    }
    return url;
  };

  return (
    <div className="eip-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={trusted ? [rehypeRaw, rehypeSlug] : [rehypeSlug]} urlTransform={urlTransform}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
