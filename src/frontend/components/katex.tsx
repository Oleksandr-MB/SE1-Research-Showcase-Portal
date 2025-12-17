"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type RenderKatexOptions = {
  delimiters: Array<{
    left: string;
    right: string;
    display: boolean;
  }>;
  ignoredTags?: string[];
};

type KatexProps = {
  content: string;
  className?: string;
  paragraphClassName?: string;
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
          window.renderMathInElement?.(element, options);
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

const renderInlineMarkdown = (text: string): ReactNode[] => {
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

    if (text.startsWith("**", cursor)) {
      const end = text.indexOf("**", cursor + 2);
      if (end !== -1) {
        flush();
        const inner = text.slice(cursor + 2, end);
        nodes.push(
          <strong key={`strong-${key++}`}>{renderInlineMarkdown(inner)}</strong>,
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
        nodes.push(<em key={`em-${key++}`}>{renderInlineMarkdown(inner)}</em>);
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
              {renderInlineMarkdown(label)}
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

export default function Katex({ content, className, paragraphClassName }: KatexProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphs = buildParagraphs(content);

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
        });
      })
      .catch(() => {
        /* Swallow failures and keep plain text */
      });

    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div ref={containerRef} className={className}>
      {paragraphs.length === 0 ? (
        <p className={paragraphClassName}>{renderInlineMarkdown(content)}</p>
      ) : (
        paragraphs.map((paragraph, idx) => {
          const lines = paragraph.split("\n");
          return (
            <p key={`${paragraph.slice(0, 20)}-${idx}`} className={paragraphClassName}>
              {lines.map((line, lineIndex) => (
                <span key={`${lineIndex}-${line.slice(0, 10)}`}>
                  {renderInlineMarkdown(line)}
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
