"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  filePath: string;
  fileName: string;
};

export default function AttachmentDownloadButton({
  filePath,
  fileName,
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);

    const targetUrl = `${API_BASE_URL}${filePath}`;
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Fetch failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      console.error("Unable to auto download attachment", downloadError);
      setError("Auto download failed. Opening file in a new tab...");
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-full border border-[var(--DarkGray)] px-3 py-1.5 text-xs font-semibold text-[var(--DarkGray)] transition-colors duration-200 hover:bg-[var(--Red)] hover:text-[var(--White)] hover:border-[var(--Red)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      {error ? (
        <span className="text-xs text-red-600 text-right">
          {error}
        </span>
      ) : null}
    </div>
  );
}
