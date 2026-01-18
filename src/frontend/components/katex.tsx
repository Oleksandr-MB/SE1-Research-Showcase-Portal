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

type MarkdownRenderOptions = InlineRenderOptions & {
  paragraphClassName?: string;
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

    if (text.startsWith("__", cursor)) {
      const end = text.indexOf("__", cursor + 2);
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

    if (text[cursor] === "_") {
      const end = text.indexOf("_", cursor + 1);
      if (end !== -1) {
        flush();
        const inner = text.slice(cursor + 1, end);
        nodes.push(<em key={`em-${key++}`}>{renderInlineMarkdown(inner, options)}</em>);
        cursor = end + 1;
        continue;
      }
    }

    if (text.startsWith("~~", cursor)) {
      const end = text.indexOf("~~", cursor + 2);
      if (end !== -1) {
        flush();
        const inner = text.slice(cursor + 2, end);
        nodes.push(
          <del key={`del-${key++}`} className="opacity-80">
            {renderInlineMarkdown(inner, options)}
          </del>,
        );
        cursor = end + 2;
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

const normalizeNewlines = (value: string) => value.replace(/\r\n?/g, "\n");

const isHorizontalRule = (line: string) =>
  /^\s{0,3}((\* ?){3,}|(- ?){3,}|(_ ?){3,})\s*$/.test(line);

const splitTableRow = (row: string) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const isTableSeparatorRow = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = splitTableRow(trimmed);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const renderMarkdownBlocks = (
  text: string,
  options: MarkdownRenderOptions = {},
): ReactNode[] => {
  const normalized = normalizeNewlines(text);
  const lines = normalized.split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;
  let key = 0;

  const pushParagraph = (paragraphLines: string[]) => {
    const trimmed = paragraphLines.join("\n").trimEnd();
    if (!trimmed.trim()) return;
    const renderedLines = trimmed.split("\n");
    nodes.push(
      <p
        key={`p-${key++}`}
        className={options.paragraphClassName}
      >
        {renderedLines.map((line, lineIndex) => (
          <span key={`p-${key}-${lineIndex}`}>
            {renderInlineMarkdown(line, options)}
            {lineIndex < renderedLines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>,
    );
  };

  while (index < lines.length) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.replace(/\t/g, "  ");

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      nodes.push(
        <hr
          key={`hr-${key++}`}
          className="border-t border-[var(--LightGray)]"
        />,
      );
      index += 1;
      continue;
    }

    const fenceMatch = line.match(/^\s*```[^`]*\s*$/);
    if (fenceMatch) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index]?.match(/^\s*```\s*$/)) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      const code = codeLines.join("\n");
      nodes.push(
        <pre
          key={`pre-${key++}`}
          className="overflow-x-auto rounded-2xl border border-[var(--LightGray)] bg-[var(--LightGray)]/40 p-4 text-sm"
        >
          <code className="font-mono">{code}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)\s*$/);
    if (headingMatch) {
      const levelRaw = headingMatch[1]?.length ?? 1;
      const level = Math.min(6, Math.max(1, levelRaw));
      const content = headingMatch[2] ?? "";
      const headingClasses =
        level <= 2
          ? "mt-6 text-lg font-semibold text-[var(--DarkGray)]"
          : "mt-5 text-base font-semibold text-[var(--DarkGray)]";
      const headingChildren = renderInlineMarkdown(content, options);
      if (level === 1) {
        nodes.push(
          <h1 key={`h-${key++}`} className={headingClasses}>
            {headingChildren}
          </h1>,
        );
      } else if (level === 2) {
        nodes.push(
          <h2 key={`h-${key++}`} className={headingClasses}>
            {headingChildren}
          </h2>,
        );
      } else if (level === 3) {
        nodes.push(
          <h3 key={`h-${key++}`} className={headingClasses}>
            {headingChildren}
          </h3>,
        );
      } else if (level === 4) {
        nodes.push(
          <h4 key={`h-${key++}`} className={headingClasses}>
            {headingChildren}
          </h4>,
        );
      } else if (level === 5) {
        nodes.push(
          <h5 key={`h-${key++}`} className={headingClasses}>
            {headingChildren}
          </h5>,
        );
      } else {
        nodes.push(
          <h6 key={`h-${key++}`} className={headingClasses}>
            {headingChildren}
          </h6>,
        );
      }
      index += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index] ?? "")) {
        const current = lines[index] ?? "";
        quoteLines.push(current.replace(/^\s*>\s?/, ""));
        index += 1;
      }
      const quoteContent = quoteLines.join("\n").trimEnd();
      nodes.push(
        <blockquote
          key={`quote-${key++}`}
          className="rounded-2xl border border-[var(--LightGray)] bg-[#FAFAFA] px-4 py-3 text-[var(--DarkGray)]"
        >
          <div className="space-y-3">
            {renderMarkdownBlocks(quoteContent, options)}
          </div>
        </blockquote>,
      );
      continue;
    }

    const maybeTableHeader = line.trim();
    const nextLine = lines[index + 1] ?? "";
    if (maybeTableHeader.includes("|") && isTableSeparatorRow(nextLine)) {
      const headerCells = splitTableRow(maybeTableHeader);
      index += 2;
      const rowCells: string[][] = [];
      while (index < lines.length) {
        const rowLine = (lines[index] ?? "").trim();
        if (!rowLine || !rowLine.includes("|")) break;
        rowCells.push(splitTableRow(rowLine));
        index += 1;
      }

      nodes.push(
        <div
          key={`tablewrap-${key++}`}
          className="overflow-x-auto rounded-2xl border border-[var(--LightGray)]"
        >
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#FAFAFA]">
              <tr>
                {headerCells.map((cell, cellIndex) => (
                  <th
                    key={`th-${cellIndex}`}
                    className="border-b border-[var(--LightGray)] px-3 py-2 text-left font-semibold text-[var(--DarkGray)]"
                  >
                    {renderInlineMarkdown(cell, options)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowCells.map((row, rowIndex) => (
                <tr key={`tr-${rowIndex}`} className="odd:bg-[var(--White)] even:bg-[#FAFAFA]">
                  {headerCells.map((_, cellIndex) => {
                    const cell = row[cellIndex] ?? "";
                    return (
                      <td
                        key={`td-${rowIndex}-${cellIndex}`}
                        className="border-b border-[var(--LightGray)] px-3 py-2 align-top text-[var(--DarkGray)]"
                      >
                        {renderInlineMarkdown(cell, options)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-+*]\s+(.+)$/);
    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];

      const takeItemText = (sourceLine: string) =>
        sourceLine.replace(/^\s*([-+*]|\d+\.)\s+/, "");

      while (index < lines.length) {
        const current = lines[index] ?? "";
        if (!current.trim()) break;

        const isSameListItem = ordered
          ? /^\s*\d+\.\s+/.test(current)
          : /^\s*[-+*]\s+/.test(current);

        if (isSameListItem) {
          items.push(takeItemText(current));
          index += 1;
          continue;
        }

        const isContinuation = /^\s{2,}\S/.test(current);
        if (isContinuation && items.length) {
          items[items.length - 1] += `\n${current.trim()}`;
          index += 1;
          continue;
        }

        break;
      }

      const ListTag = ordered ? "ol" : "ul";
      nodes.push(
        <ListTag
          key={`list-${key++}`}
          className={`pl-6 text-[var(--DarkGray)] ${ordered ? "list-decimal" : "list-disc"} space-y-1`}
        >
          {items.map((item, itemIndex) => (
            <li key={`li-${itemIndex}`}>
              {renderInlineMarkdown(item, options)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (!current.trim()) break;

      const startsFence = /^\s*```/.test(current);
      const startsHeading = /^(#{1,6})\s+/.test(current);
      const startsQuote = /^\s*>/.test(current);
      const startsList = /^\s*([-+*]|\d+\.)\s+/.test(current);
      const startsHr = isHorizontalRule(current);
      const startsTable =
        current.trim().includes("|") && isTableSeparatorRow(lines[index + 1] ?? "");

      if (
        paragraphLines.length > 0 &&
        (startsFence || startsHeading || startsQuote || startsList || startsHr || startsTable)
      ) {
        break;
      }

      paragraphLines.push(current);
      index += 1;
    }
    pushParagraph(paragraphLines);
  }

  return nodes;
};

export default function Katex({
  content,
  className,
  paragraphClassName,
  attachments,
}: KatexProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resolveImageSrc = attachments?.length
    ? buildAttachmentImageResolver(attachments)
    : undefined;
  const blocks = renderMarkdownBlocks(content, { resolveImageSrc, paragraphClassName });

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
  }, [content, attachments]);

  return (
    <div ref={containerRef} className={className}>
      <div className="space-y-4">{blocks}</div>
    </div>
  );
}
