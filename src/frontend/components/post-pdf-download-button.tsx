"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { DownloadIcon } from "@/components/icons";

type Props = {
  title: string;
  authorsText?: string | null;
  abstract?: string | null;
  body?: string | null;
};

const toAscii = (value: string) =>
  value.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");

const escapePdfString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const stripMarkdownForPdf = (markdown: string) => {
  let text = markdown.replace(/\r\n?/g, "\n");

  text = text.replace(/```[\s\S]*?```/g, (match) => {
    const withoutFence = match.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
    return `\n${withoutFence}\n`;
  });

  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, (_, alt: string) => alt || "Image");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, label: string) => label);
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  text = text.replace(/^\s{0,3}>\s?/gm, "");

  return text.trim();
};

const wrapText = (text: string, maxChars: number) => {
  const out: string[] = [];
  const paragraphs = text.split(/\n{2,}/);

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line.trim()) {
        out.push("");
        continue;
      }

      const words = line.trim().split(/\s+/);
      let current = "";
      for (const word of words) {
        if (!current) {
          current = word;
          continue;
        }
        if (current.length + 1 + word.length <= maxChars) {
          current += ` ${word}`;
        } else {
          out.push(current);
          current = word;
        }
      }
      if (current) out.push(current);
    }
    out.push("");
  }

  while (out.length && !out[out.length - 1]) out.pop();
  return out;
};

const buildSimplePdf = (lines: string[]) => {
  const MAX_LINES_PER_PAGE = 46;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += MAX_LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + MAX_LINES_PER_PAGE));
  }

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;

  let nextId = 4;
  for (let i = 0; i < pages.length; i += 1) {
    pageIds.push(nextId++);
    contentIds.push(nextId++);
  }

  const objects: Array<{ id: number; body: string }> = [];
  objects.push({
    id: catalogId,
    body: `<< /Type /Catalog /Pages ${pagesId} 0 R >>`,
  });
  objects.push({
    id: pagesId,
    body: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  });
  objects.push({
    id: fontId,
    body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
  });

  for (let i = 0; i < pages.length; i += 1) {
    const pageId = pageIds[i]!;
    const contentId = contentIds[i]!;
    const streamLines = pages[i]!.map((line) => escapePdfString(toAscii(line)));
    const textOps: string[] = [];
    streamLines.forEach((line) => {
      textOps.push(`(${line}) Tj`);
      textOps.push("T*");
    });
    const streamBody =
      [
        "BT",
        "/F1 12 Tf",
        "14 TL",
        "72 720 Td",
        ...textOps,
        "ET",
      ].join("\n") + "\n";

    const streamLength = streamBody.length;

    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    });
    objects.push({
      id: contentId,
      body: `<< /Length ${streamLength} >>\nstream\n${streamBody}endstream`,
    });
  }

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(toAscii(pdf));
};

const slugifyFileName = (title: string) => {
  const trimmed = title.trim();
  if (!trimmed) return "post";
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "post";
};

export default function PostPdfDownloadButton({
  title,
  authorsText,
  abstract,
  body,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const parts: string[] = [];
      if (title.trim()) parts.push(title.trim());
      if (authorsText?.trim()) parts.push(stripMarkdownForPdf(authorsText));
      if (abstract?.trim()) parts.push(stripMarkdownForPdf(abstract));
      if (body?.trim()) parts.push(stripMarkdownForPdf(body));

      const text = parts.join("\n\n");
      const wrappedLines = wrapText(text, 92);
      const bytes = buildSimplePdf(wrappedLines);

      const blob = new Blob([bytes], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${slugifyFileName(title)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (pdfError) {
      console.error("Failed to generate PDF", pdfError);
      setError("PDF generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={isGenerating}
        onClick={handleDownload}
        disabled={isGenerating}
        className="gap-2"
      >
        <DownloadIcon />
        PDF
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
