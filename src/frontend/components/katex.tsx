import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { API_BASE_URL } from "@/lib/api";

type KatexProps = {
  content: string;
  className?: string;
  paragraphClassName?: string;
  attachments?: string[];
};

const toAttachmentApiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

const normalizeResourceValue = (value: string) =>
  value.trim().replace(/^<|>$/g, "").replace(/^['"]|['"]$/g, "");

const isExternalUrl = (value: string) => /^(https?:|data:|mailto:)/i.test(value);

const sanitizeHref = (href: string) => {
  const normalized = href.trim();
  if (!normalized) return "#";
  const lower = normalized.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("/") ||
    lower.startsWith("#")
  ) {
    return normalized;
  }
  return "#";
};

const isExternalHref = (href: string) => {
  const lower = href.toLowerCase();
  return lower.startsWith("http://") || lower.startsWith("https://");
};

const buildAttachmentResolver = (attachments?: string[]) => {
  if (!attachments?.length) {
    return null;
  }

  const byName = new Map<string, string>();
  attachments.forEach((path) => {
    const normalized = path.replace(/\\/g, "/").trim();
    if (!normalized) return;
    const fileName = normalized.split("/").filter(Boolean).pop();
    if (!fileName) return;
    byName.set(normalized.toLowerCase(), normalized);
    byName.set(fileName.toLowerCase(), normalized);
  });

  return byName;
};

const resolveAttachmentUrl = (
  raw: string,
  byName: Map<string, string> | null,
) => {
  const cleaned = normalizeResourceValue(raw);
  if (!cleaned) return "";

  if (isExternalUrl(cleaned) || cleaned.startsWith("#")) {
    return cleaned;
  }

  const withoutQuery = cleaned.split(/[?#]/)[0] ?? cleaned;
  const normalized = withoutQuery.replace(/\\/g, "/");
  const lowerNormalized = normalized.toLowerCase();

  const marker = "/attachments/";
  const markerIndex = lowerNormalized.lastIndexOf(marker);
  if (markerIndex !== -1) {
    const path = normalized.slice(markerIndex);
    return toAttachmentApiUrl(path);
  }

  if (lowerNormalized.startsWith("attachments/")) {
    return toAttachmentApiUrl(`/${normalized}`);
  }

  if (byName) {
    const fileName = normalized.split("/").filter(Boolean).pop() ?? "";
    const direct =
      byName.get(lowerNormalized) ?? byName.get(fileName.toLowerCase());
    if (direct) {
      return toAttachmentApiUrl(direct);
    }
  }

  return cleaned;
};

export default function Katex({
  content,
  className,
  paragraphClassName,
  attachments,
}: KatexProps) {
  const resolver = buildAttachmentResolver(attachments);
  const resolvedParagraphClassName =
    paragraphClassName ?? "body-apple text-[var(--DarkGray)] leading-relaxed";

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="h2-apple mt-6 text-[var(--DarkGray)]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="h3-apple mt-6 text-[var(--DarkGray)]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 text-xl font-semibold leading-tight text-[var(--DarkGray)]">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-5 text-lg font-semibold leading-tight text-[var(--DarkGray)]">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="mt-4 text-base font-semibold leading-tight text-[var(--DarkGray)]">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="mt-4 text-sm font-semibold uppercase tracking-wide text-[var(--Gray)]">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className={`${resolvedParagraphClassName} mt-4 first:mt-0`}>
              {children}
            </p>
          ),
          a: ({ href, children }) => {
            const rawHref = typeof href === "string" ? href : "";
            const resolved = rawHref ? resolveAttachmentUrl(rawHref, resolver) : "";
            const safe = sanitizeHref(resolved || rawHref);
            const external = isExternalHref(safe);
            return (
              <a
                href={safe}
                className="underline underline-offset-4 hover:text-[var(--Red)]"
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer noopener" : undefined}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt = "" }) => {
            const rawSrc = typeof src === "string" ? src : "";
            const resolved = rawSrc ? resolveAttachmentUrl(rawSrc, resolver) : "";
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolved || rawSrc}
                alt={alt}
                loading="lazy"
                className="my-4 block max-w-full rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] shadow-soft-xs"
              />
            );
          },
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-[var(--LightGray)]">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[#FAFAFA]">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-[var(--LightGray)] px-3 py-2 text-left font-semibold text-[var(--DarkGray)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--LightGray)] px-3 py-2 align-top text-[var(--DarkGray)]">
              {children}
            </td>
          ),
          ul: ({ children }) => (
            <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed marker:text-[var(--Gray)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-4 list-decimal space-y-2 pl-6 leading-relaxed marker:text-[var(--Gray)]">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-2xl border border-[var(--LightGray)] border-l-4 border-l-[var(--DarkGray)]/30 bg-[var(--LightGray)]/30 px-4 py-3 text-[var(--DarkGray)] shadow-soft-xs">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children }) => {
            return (
              <code
                className={
                  codeClassName
                    ? `rounded bg-[var(--LightGray)]/60 px-1 py-0.5 font-mono text-[0.9em] ${codeClassName}`
                    : "rounded bg-[var(--LightGray)]/60 px-1 py-0.5 font-mono text-[0.9em]"
                }
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-2xl border border-[var(--LightGray)] bg-[var(--LightGray)]/40 p-4 text-sm [&>code]:rounded-none [&>code]:bg-transparent [&>code]:px-0 [&>code]:py-0 [&>code]:text-[0.95em]">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
