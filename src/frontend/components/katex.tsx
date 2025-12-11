"use client";

import { useEffect, useRef } from "react";

type KatexProps = {
  content: string;
  className?: string;
  paragraphClassName?: string;
};

declare global {
  interface Window {
    renderKatex?: (element: HTMLElement, options: unknown) => void;
    __katexLoadingPromise?: Promise<void>;
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

const ensureKatex = async () => {
  if (typeof window === "undefined") return;
  if (window.renderKatex) {
    return;
  }
  if (window.__katexLoadingPromise) {
    await window.__katexLoadingPromise;
    return;
  }

  window.__katexLoadingPromise = (async () => {
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
    await loadScript(
      "katex-script",
      "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
    );
    await loadScript(
      "katex-auto-render",
      "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js",
    );
  })();

  await window.__katexLoadingPromise;
};

const buildParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

export default function Katex({ content, className, paragraphClassName }: KatexProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphs = buildParagraphs(content);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    ensureKatex()
      .then(() => {
        if (containerRef.current && window.renderKatex) {
          window.renderKatex(containerRef.current, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "\\[", right: "\\]", display: true },
              { left: "$", right: "$", display: false },
              { left: "\\(", right: "\\)", display: false },
            ],
          });
        }
      })
      .catch(() => {
        /* Swallow failures and keep plain text */
      });
  }, [content]);

  return (
    <div ref={containerRef} className={className}>
      {paragraphs.length === 0 ? (
        <p className={paragraphClassName}>{content}</p>
      ) : (
        paragraphs.map((paragraph, idx) => {
          const lines = paragraph.split("\n");
          return (
            <p key={`${paragraph.slice(0, 20)}-${idx}`} className={paragraphClassName}>
              {lines.map((line, lineIndex) => (
                <span key={`${lineIndex}-${line.slice(0, 10)}`}>
                  {line}
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
