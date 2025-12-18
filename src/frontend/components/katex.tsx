"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type RenderKatexOptions = {
  delimiters: Array<{
    left: string;
    right: string;
    display: boolean;
  }>;
  ignoredTags?: string[];
  throwOnError?: boolean;
  strict?: "warn" | "ignore" | boolean;
  errorColor?: string;
  trust?: boolean;
  macros?: Record<string, string>;
  preProcess?: (math: string) => string;
};

type KatexProps = {
  content: string;
  className?: string;
  paragraphClassName?: string;
  attachments?: string[];
};

declare global {
  interface Window {
    renderKatex?: (element: HTMLElement, options: RenderKatexOptions) => void;
    renderMathInElement?: (element: HTMLElement, options?: RenderKatexOptions) => void;
  }
}

const loadScript = (id: string, src: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });

const ensureKatex = (() => {
  let katexPromise: Promise<void> | null = null;

  return async () => {
    if (typeof window === "undefined" || window.renderKatex) return;
    if (katexPromise) {
      await katexPromise;
      return;
    }

    katexPromise = (async () => {
      if (!document.getElementById("katex-css")) {
        const link = document.createElement("link");
        link.id = "katex-css";
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
        document.head.appendChild(link);
      }
      await loadScript("katex-script", "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js");
      await loadScript(
        "katex-auto-render",
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js",
      );
      if (!window.renderKatex) {
        window.renderKatex = (element, options) => {
          try {
            window.renderMathInElement?.(element, options);
          } catch (error) {
            console.warn("KaTeX rendering failed", error);
          }
        };
      }
    })();

    await katexPromise;
  };
})();

const buildParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

const SPACE_SENSITIVE_COMMANDS = [
  "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "varpi", "rho", "varrho", "sigma", "varsigma",
  "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega",
  "sin", "cos", "tan", "cot", "sec", "csc",
  "ln", "log", "exp",
] as const;

const SPACE_SENSITIVE_COMMAND_RE = new RegExp(
  String.raw`\\(${SPACE_SENSITIVE_COMMANDS.join("|")})(?=[A-Za-z0-9])`,
  "g",
);

const preprocessMath = (math: string) =>
  math.replace(SPACE_SENSITIVE_COMMAND_RE, String.raw`\\$1 `);

function InlineImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="my-3 block max-w-full rounded-2xl border border-[var(--LightGray)] bg-[var(--LightGray)]/20 px-4 py-3 text-sm italic text-[var(--Gray)]">
        {alt.trim() || "Image failed to load"}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="my-3 block max-w-full rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] shadow-soft-xs"
    />
  );
}

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

type InlineRenderOptions = {
  resolveImageSrc?: (raw: string) => string | null;
};

const buildAttachmentImageResolver = (attachments: string[]) => {
  const byName = new Map<string, string>();

  attachments.forEach((path) => {
    const normalized = path.replace(/\\/g, "/").trim();
    if (!normalized) return;
    const fileName = normalized.split("/").filter(Boolean).pop();
    if (!fileName) return;
    byName.set(fileName.toLowerCase(), normalized);
    byName.set(normalized.toLowerCase(), normalized);
  });

  return (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const withoutQuery = trimmed.split(/[?#]/)[0] ?? trimmed;
    const normalized = withoutQuery.replace(/\\/g, "/");

    const attachmentMarker = "/attachments/";
    const markerIndex = normalized.toLowerCase().lastIndexOf(attachmentMarker);
    const candidate = markerIndex !== -1
      ? normalized.slice(markerIndex)
      : normalized;

    const fileName = candidate.split("/").filter(Boolean).pop() ?? "";
    const directMatch =
      byName.get(candidate.toLowerCase()) ?? byName.get(fileName.toLowerCase());
    if (!directMatch) return null;

    return `${API_BASE_URL}${directMatch.startsWith("/") ? "" : "/"}${directMatch}`;
  };
};

const renderInlineMarkdown = (
  text: string,
  options: InlineRenderOptions = {},
): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let buffer = "";
  let cursor = 0;
  let key = 0;

  const flush = () => {
    if (!buffer) return;
    nodes.push(buffer);
    buffer = "";
  };

  while (cursor < text.length) {
    if (text[cursor] === "`") {
      const end = text.indexOf("`", cursor + 1);
      if (end !== -1) {
        flush();
        const code = text.slice(cursor + 1, end);
        nodes.push(
          <code
            key={`code-${key++}`}
            className="rounded bg-[var(--LightGray)]/60 px-1 py-0.5 font-mono text-[0.9em]"
          >
            {code}
          </code>,
        );
        cursor = end + 1;
        continue;
      }
    }

    if (text.startsWith("![", cursor)) {
      const labelEnd = text.indexOf("]", cursor + 2);
      if (labelEnd !== -1 && text[labelEnd + 1] === "(") {
        const srcEnd = text.indexOf(")", labelEnd + 2);
        if (srcEnd !== -1) {
          flush();
          const alt = text.slice(cursor + 2, labelEnd);
          const srcRaw = text.slice(labelEnd + 2, srcEnd);
          const resolved = options.resolveImageSrc?.(srcRaw);

          if (resolved) {
            nodes.push(
              <InlineImage
                key={`img-${key++}`}
                src={resolved}
                alt={alt}
              />,
            );
          } else {
            nodes.push(`![${alt}](${srcRaw})`);
          }

          cursor = srcEnd + 1;
          continue;
        }
      }
    }

    if (text.startsWith("**", cursor)) {
      const end = text.indexOf("**", cursor + 2);
      if (end !== -1) {
        flush();
        const inner = text.slice(cursor + 2, end);
        nodes.push(
          <strong key={`strong-${key++}`}>
            {renderInlineMarkdown(inner, options)}
          </strong>,
        );
        cursor = end + 2;
        continue;
      }
    }

    if (text[cursor] === "*") {
      const end = text.indexOf("*", cursor + 1);
      if (end !== -1) {
        flush();
        const inner = text.slice(cursor + 1, end);
        nodes.push(<em key={`em-${key++}`}>{renderInlineMarkdown(inner, options)}</em>);
        cursor = end + 1;
        continue;
      }
    }

    if (text[cursor] === "[") {
      const labelEnd = text.indexOf("]", cursor + 1);
      if (labelEnd !== -1 && text[labelEnd + 1] === "(") {
        const hrefEnd = text.indexOf(")", labelEnd + 2);
        if (hrefEnd !== -1) {
          flush();
          const label = text.slice(cursor + 1, labelEnd);
          const hrefRaw = text.slice(labelEnd + 2, hrefEnd);
          const href = sanitizeHref(hrefRaw);
          const external = isExternalHref(href);

          nodes.push(
            <a
              key={`link-${key++}`}
              href={href}
              className="underline underline-offset-4 hover:text-[var(--Red)]"
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer noopener" : undefined}
            >
              {renderInlineMarkdown(label, options)}
            </a>,
          );
          cursor = hrefEnd + 1;
          continue;
        }
      }
    }

    buffer += text[cursor];
    cursor += 1;
  }

  flush();
  return nodes;
};

export default function Katex({
  content,
  className,
  paragraphClassName,
  attachments,
}: KatexProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphs = buildParagraphs(content);
  const resolveImageSrc = attachments?.length
    ? buildAttachmentImageResolver(attachments)
    : undefined;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let cancelled = false;
    ensureKatex()
      .then(() => {
        if (cancelled || !window.renderKatex) return;
        window.renderKatex(element, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
          ],
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
          throwOnError: false,
          strict: "ignore",
          preProcess: preprocessMath,
        });
      })
      .catch(() => {
 
      });

    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div ref={containerRef} className={className}>
      {paragraphs.length === 0 ? (
        <p className={paragraphClassName}>
          {renderInlineMarkdown(content, { resolveImageSrc })}
        </p>
      ) : (
        paragraphs.map((paragraph, idx) => {
          const lines = paragraph.split("\n");
          return (
            <p key={`${paragraph.slice(0, 20)}-${idx}`} className={paragraphClassName}>
              {lines.map((line, lineIndex) => (
                <span key={`${lineIndex}-${line.slice(0, 10)}`}>
                  {renderInlineMarkdown(line, { resolveImageSrc })}
                  {lineIndex < lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          );
        })
      )}
    </div>
  );
}
