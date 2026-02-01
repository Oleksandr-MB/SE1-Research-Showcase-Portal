"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { DownloadIcon } from "@/components/icons";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  title: string;
  authorsText?: string | null;
  abstract?: string | null;
  body?: string | null;
  attachments?: string[];
};

type PdfTextItem = { type: "text"; text: string };

type PdfImageItem = { type: "image"; alt: string; src: string };

type PdfItem = PdfTextItem | PdfImageItem;

type LoadedImage = {
  src: string;
  width: number;
  height: number;
  bytes: Uint8Array;
};

type LayoutItem = PdfTextItem | { type: "image"; alt: string; image: LoadedImage };

type PdfImageObject = LoadedImage & { id: number; name: string };

type PageOp =
  | { type: "text"; text: string; x: number; y: number }
  | { type: "image"; image: PdfImageObject; x: number; y: number; width: number; height: number };

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const FONT_SIZE = 12;
const LINE_HEIGHT = 14;
const IMAGE_GAP = 12;
const MAX_LINE_CHARS = 92;

const toAscii = (value: string) =>
  value.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");

const escapePdfString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const stripMarkdownToText = (markdown: string) => {
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

const splitMarkdownWithImages = (markdown: string) => {
  const blocks: Array<{ type: "text"; value: string } | { type: "image"; alt: string; src: string }> = [];
  const imageRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = imageRe.exec(markdown)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      blocks.push({ type: "text", value: markdown.slice(lastIndex, start) });
    }
    blocks.push({ type: "image", alt: match[1] || "", src: match[2] || "" });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < markdown.length) {
    blocks.push({ type: "text", value: markdown.slice(lastIndex) });
  }

  return blocks;
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
    const candidate = markerIndex !== -1 ? normalized.slice(markerIndex) : normalized;

    const fileName = candidate.split("/").filter(Boolean).pop() ?? "";
    const directMatch = byName.get(candidate.toLowerCase()) ?? byName.get(fileName.toLowerCase());
    if (!directMatch) return null;

    return `${API_BASE_URL}${directMatch.startsWith("/") ? "" : "/"}${directMatch}`;
  };
};

const normalizeImageSource = (raw: string) =>
  raw.trim().replace(/^<|>$/g, "").replace(/^['"]|['"]$/g, "");

const resolveImageSrc = (
  raw: string,
  resolver?: (rawValue: string) => string | null,
) => {
  const cleaned = normalizeImageSource(raw);
  if (!cleaned) return null;
  if (/^(https?:|data:)/i.test(cleaned)) return cleaned;

  const resolved = resolver?.(cleaned);
  if (resolved) return resolved;

  const normalized = cleaned.startsWith("attachments/") ? `/${cleaned}` : cleaned;
  if (normalized.startsWith("/attachments/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  return null;
};

const buildPdfItems = (
  sections: Array<string | null | undefined>,
  resolver?: (rawValue: string) => string | null,
): PdfItem[] => {
  const items: PdfItem[] = [];

  const pushTextLines = (value: string) => {
    const stripped = stripMarkdownToText(value);
    if (!stripped) return;
    const wrapped = wrapText(stripped, MAX_LINE_CHARS);
    wrapped.forEach((line) => items.push({ type: "text", text: line }));
  };

  for (const section of sections) {
    const value = section?.trim();
    if (!value) continue;

    if (items.length) {
      items.push({ type: "text", text: "" });
    }

    const blocks = splitMarkdownWithImages(value);
    blocks.forEach((block) => {
      if (block.type === "text") {
        pushTextLines(block.value);
        return;
      }

      const resolved = resolveImageSrc(block.src, resolver);
      if (resolved) {
        items.push({ type: "image", alt: block.alt || "", src: resolved });
        return;
      }

      items.push({ type: "text", text: block.alt?.trim() || "Image" });
    });
  }

  return items;
};

type DecodedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

const decodeImageBlob = async (blob: Blob): Promise<DecodedImage> => {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx) => ctx.drawImage(bitmap, 0, 0),
    };
  }

  return new Promise<DecodedImage>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      resolve({
        width,
        height,
        draw: (ctx) => ctx.drawImage(img, 0, 0),
      });
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };

    img.src = url;
  });
};

const loadImageAsJpeg = async (src: string): Promise<LoadedImage | null> => {
  try {
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const decoded = await decodeImageBlob(blob);

    const canvas = document.createElement("canvas");
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    decoded.draw(ctx);

    const jpegBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!jpegBlob) return null;

    const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
    return {
      src,
      width: decoded.width,
      height: decoded.height,
      bytes,
    };
  } catch {
    return null;
  }
};

const loadPdfItems = async (items: PdfItem[]): Promise<LayoutItem[]> => {
  const cache = new Map<string, Promise<LoadedImage | null>>();
  const loaded: LayoutItem[] = [];

  for (const item of items) {
    if (item.type === "text") {
      loaded.push(item);
      continue;
    }

    if (!cache.has(item.src)) {
      cache.set(item.src, loadImageAsJpeg(item.src));
    }

    const image = await cache.get(item.src);
    if (image) {
      loaded.push({ type: "image", alt: item.alt, image });
    } else {
      const fallback = item.alt?.trim() || "Image failed to load";
      loaded.push({ type: "text", text: fallback });
    }
  }

  return loaded;
};

const concatBytes = (...parts: Array<string | Uint8Array>) => {
  const encoder = new TextEncoder();
  const arrays = parts.map((part) =>
    typeof part === "string" ? encoder.encode(part) : part,
  );
  const totalLength = arrays.reduce((sum, current) => sum + current.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((arr) => {
    output.set(arr, offset);
    offset += arr.length;
  });
  return output;
};

const buildPdfDocument = (items: LayoutItem[]): Uint8Array => {
  const safeItems = items.length ? items : [{ type: "text", text: "No content." }];

  const imageMap = new Map<string, PdfImageObject>();
  const imageObjects: PdfImageObject[] = [];

  const ensureImageObject = (image: LoadedImage) => {
    const existing = imageMap.get(image.src);
    if (existing) return existing;

    const created: PdfImageObject = {
      ...image,
      id: 0,
      name: "",
    };
    imageMap.set(image.src, created);
    imageObjects.push(created);
    return created;
  };

  const pages: PageOp[][] = [];
  let currentOps: PageOp[] = [];
  let cursorY = PAGE_HEIGHT - MARGIN;

  const startNewPage = () => {
    if (currentOps.length) {
      pages.push(currentOps);
    }
    currentOps = [];
    cursorY = PAGE_HEIGHT - MARGIN;
  };

  startNewPage();

  for (const item of safeItems) {
    if (item.type === "text") {
      const line = toAscii(item.text);
      const needsSpace = cursorY - LINE_HEIGHT < MARGIN;
      if (needsSpace && currentOps.length) {
        startNewPage();
      }

      if (!line) {
        cursorY -= LINE_HEIGHT;
        if (cursorY < MARGIN) {
          startNewPage();
        }
        continue;
      }

      currentOps.push({ type: "text", text: line, x: MARGIN, y: cursorY });
      cursorY -= LINE_HEIGHT;
      continue;
    }

    const imageObject = ensureImageObject(item.image);
    const maxWidth = PAGE_WIDTH - MARGIN * 2;
    const maxHeight = PAGE_HEIGHT - MARGIN * 2;
    const scale = Math.min(
      maxWidth / imageObject.width,
      maxHeight / imageObject.height,
      1,
    );
    const drawWidth = imageObject.width * scale;
    const drawHeight = imageObject.height * scale;

    if (cursorY - drawHeight < MARGIN && currentOps.length) {
      startNewPage();
    }

    const x = MARGIN;
    const y = cursorY - drawHeight;
    currentOps.push({
      type: "image",
      image: imageObject,
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
    cursorY = y - IMAGE_GAP;

    const caption = item.alt?.trim();
    if (caption) {
      if (cursorY - LINE_HEIGHT < MARGIN && currentOps.length) {
        startNewPage();
      }
      currentOps.push({ type: "text", text: toAscii(caption), x: MARGIN, y: cursorY });
      cursorY -= LINE_HEIGHT;
    }
  }

  if (currentOps.length) {
    pages.push(currentOps);
  }

  const finalPages = pages.length ? pages : [[]];

  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  let nextId = 4;

  imageObjects.forEach((image) => {
    image.id = nextId++;
    image.name = `Im${image.id}`;
  });

  const pageIds: number[] = [];
  const contentIds: number[] = [];

  finalPages.forEach(() => {
    pageIds.push(nextId++);
    contentIds.push(nextId++);
  });

  const objects: Array<{ id: number; bytes: Uint8Array }> = [];

  objects.push({
    id: catalogId,
    bytes: concatBytes(
      `${catalogId} 0 obj\n`,
      `<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`,
      "endobj\n",
    ),
  });

  objects.push({
    id: pagesId,
    bytes: concatBytes(
      `${pagesId} 0 obj\n`,
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${finalPages.length} >>\n`,
      "endobj\n",
    ),
  });

  objects.push({
    id: fontId,
    bytes: concatBytes(
      `${fontId} 0 obj\n`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n",
      "endobj\n",
    ),
  });

  imageObjects.forEach((image) => {
    const dict = `<< /Type /XObject /Subtype /Image /Width ${Math.round(image.width)} /Height ${Math.round(image.height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`;
    const bytes = concatBytes(
      `${image.id} 0 obj\n`,
      dict,
      image.bytes,
      "\nendstream\nendobj\n",
    );
    objects.push({ id: image.id, bytes });
  });

  const xObjectResources = imageObjects.length
    ? ` /XObject << ${imageObjects.map((image) => `/${image.name} ${image.id} 0 R`).join(" ")} >>`
    : "";

  finalPages.forEach((ops, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];

    const resources = `<< /Font << /F1 ${fontId} 0 R >>${xObjectResources} >>`;

    objects.push({
      id: pageId,
      bytes: concatBytes(
        `${pageId} 0 obj\n`,
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources ${resources} >>\n`,
        "endobj\n",
      ),
    });

    const opsText: string[] = [];
    ops.forEach((op) => {
      if (op.type === "text") {
        const escaped = escapePdfString(toAscii(op.text));
        opsText.push("BT");
        opsText.push(`/F1 ${FONT_SIZE} Tf`);
        opsText.push(`${op.x} ${op.y} Td`);
        opsText.push(`(${escaped}) Tj`);
        opsText.push("ET");
        return;
      }

      opsText.push("q");
      opsText.push(`${op.width} 0 0 ${op.height} ${op.x} ${op.y} cm`);
      opsText.push(`/${op.image.name} Do`);
      opsText.push("Q");
    });

    const streamBody = `${opsText.join("\n")}\n`;
    const streamBytes = new TextEncoder().encode(streamBody);

    const contentBytes = concatBytes(
      `${contentId} 0 obj\n`,
      `<< /Length ${streamBytes.length} >>\nstream\n`,
      streamBytes,
      "endstream\nendobj\n",
    );
    objects.push({ id: contentId, bytes: contentBytes });
  });

  objects.sort((a, b) => a.id - b.id);

  const header = new TextEncoder().encode("%PDF-1.4\n");
  const offsets: number[] = [0];
  let offset = header.length;

  objects.forEach((obj) => {
    offsets.push(offset);
    offset += obj.bytes.length;
  });

  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const xrefBytes = new TextEncoder().encode(xref);
  const trailerBytes = new TextEncoder().encode(trailer);

  const parts = [header, ...objects.map((obj) => obj.bytes), xrefBytes, trailerBytes];
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let cursor = 0;

  parts.forEach((part) => {
    output.set(part, cursor);
    cursor += part.length;
  });

  return output;
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
  attachments,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const resolver = attachments?.length ? buildAttachmentImageResolver(attachments) : undefined;
      const items = buildPdfItems([
        title,
        authorsText ?? undefined,
        abstract ?? undefined,
        body ?? undefined,
      ], resolver);

      const hydratedItems = await loadPdfItems(items);
      const bytes = buildPdfDocument(hydratedItems);

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
