"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPost,
  type CreatePostPayload,
  type PostPhase,
  uploadPostAttachment,
  type AttachmentUploadResponse,
} from "@/lib/api";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type FormState = {
  title: string;
  abstract: string;
  authorsText: string;
  body: string;
  bibtex: string;
  tags: string;
  phase: PostPhase;
};

const initialState: FormState = {
  title: "",
  abstract: "",
  authorsText: "",
  body: "",
  bibtex: "",
  tags: "",
  phase: "draft",
};

export default function NewPostPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [token, setToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentUploadResponse[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<PostPhase>("draft");
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rsp_token")
        : null;

    if (!stored) {
      setCheckingAuth(false);
      router.replace("/login?next=/posts/new");
      return;
    }

    setToken(stored);
    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttachmentChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setAttachmentError(null);
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    if (!token) {
      setAttachmentError("You need to be signed in to upload attachments.");
      return;
    }

    setIsUploadingAttachments(true);
    const selectedFiles = Array.from(files);

    try {
      const uploaded: AttachmentUploadResponse[] = [];
      for (const file of selectedFiles) {
        const uploadResult = await uploadPostAttachment(token, file);
        uploaded.push(uploadResult);
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        setAttachmentError(uploadError.message);
      } else {
        setAttachmentError("Failed to upload attachments.");
      }
    } finally {
      setIsUploadingAttachments(false);
      event.target.value = "";
    }
  };

  const handleRemoveAttachment = (filePath: string) => {
    setAttachments((prev) =>
      prev.filter((attachment) => attachment.file_path !== filePath),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("You need to be signed in to create a post.");
      return;
    }

    if (isUploadingAttachments) {
      setError("Please wait for attachments to finish uploading.");
      return;
    }

    const trimmedTitle = form.title.trim();
    const trimmedAbstract = form.abstract.trim();
    const trimmedAuthors = form.authorsText.trim();
    const trimmedBody = form.body.trim();

    if (
      !trimmedTitle ||
      !trimmedAbstract ||
      !trimmedAuthors ||
      !trimmedBody
    ) {
      setError("Title, abstract, authors, and body are required.");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const attachmentPayload =
      attachments.length > 0
        ? attachments.map(({ file_path, mime_type }) => ({
            file_path,
            mime_type,
          }))
        : undefined;

    const phaseToUse: PostPhase = submitPhase ?? "draft";

    const payload: CreatePostPayload = {
      title: trimmedTitle,
      abstract: trimmedAbstract,
      authors_text: trimmedAuthors,
      body: trimmedBody,
      bibtex: form.bibtex.trim() || undefined,
      tags: tags.length ? tags : undefined,
      phase: phaseToUse,
      attachments: attachmentPayload,
    };

    setIsSubmitting(true);

    try {
      await createPost(token, payload);
      setSuccess(
        phaseToUse === "published"
          ? "Post published. Redirecting you to your lab..."
          : "Draft saved. Redirecting you to your lab...",
      );
      setForm(initialState);
      setAttachments([]);
      redirectTimeout.current = setTimeout(() => {
        router.push("/me");
      }, 1400);
    } catch (submissionError) {
      if (submissionError instanceof Error) {
        setError(submissionError.message);
      } else {
        setError("Something went wrong while creating the post.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface_muted)] text-[var(--muted_text)]">
        Checking your session...
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface_muted)] text-[var(--muted_text)]">
        Redirecting you to sign in...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface_muted)] px-4 py-10 text-[var(--normal_text)] sm:px-6">
      <main className="shadow-soft-md mx-auto max-w-4xl rounded-[32px] bg-[var(--surface_primary)] p-6 ring-1 ring-[var(--ring_on_surface)] sm:p-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary_accent)]">
              Research post
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--titles)]">
              Draft a new post
            </h1>
            <p className="mt-2 text-sm text-[var(--muted_text)]">
              You can keep exactly one draft at a time. Publish or delete it to
              start another.
            </p>
          </div>
          <Link
            href="/me"
            className="rounded-full border border-[var(--primary_accent)] px-5 py-2 text-sm font-semibold text-[var(--primary_accent)] transition-colors hover:border-[var(--titles)] hover:text-[var(--titles)]"
          >
            Back to my lab
          </Link>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--titles)]">
              Title
              <input
                required
                name="title"
                value={form.title}
                onChange={handleInputChange}
                className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)]"
                placeholder="Give your research a concise title"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--titles)]">
              Authors
              <input
                required
                name="authorsText"
                value={form.authorsText}
                onChange={handleInputChange}
                className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)]"
                placeholder="List the contributing authors"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--titles)]">
            Abstract
            <textarea
              required
              name="abstract"
              value={form.abstract}
              onChange={handleInputChange}
              rows={4}
              className="rounded-3xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)]"
              placeholder="Summarize your contribution..."
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--titles)]">
            Full body
            <textarea
              required
              name="body"
              value={form.body}
              onChange={handleInputChange}
              rows={10}
              className="rounded-3xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)]"
              placeholder="Include the details, results, and discussion..."
            />
          </label>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--titles)]">
              BibTeX reference (optional)
              <textarea
                name="bibtex"
                value={form.bibtex}
                onChange={handleInputChange}
                rows={4}
                className="rounded-3xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)]"
                placeholder="@article{...}"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--titles)]">
              Tags (comma separated)
              <input
                name="tags"
                value={form.tags}
                onChange={handleInputChange}
                className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)]"
                placeholder="neuroscience, robotics, ai"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 text-sm font-medium text-[var(--titles)]">
              <label htmlFor="attachments-input">Attachments</label>
              <input
                id="attachments-input"
                type="file"
                multiple
                onChange={handleAttachmentChange}
                disabled={isUploadingAttachments}
                className="rounded-2xl border border-dashed border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-sm text-[var(--muted_text)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--primary_accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--inverse_text)]"
              />
              <span className="text-xs font-normal text-[var(--muted_text)]">
                Upload figures, supplementary data, or other artifacts. Uploaded
                items will be linked to this draft when you save it.
              </span>
            </div>

            {isUploadingAttachments && (
              <p className="text-xs font-medium text-[var(--muted_text_soft)]">
                Uploading attachments...
              </p>
            )}
            {attachmentError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {attachmentError}
              </div>
            )}
            {attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((attachment) => (
                  <li
                    key={attachment.file_path}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_muted)] px-4 py-3 text-sm"
                  >
                    <div className="max-w-[75%]">
                      <p className="font-medium text-[var(--titles)]">
                        {attachment.original_filename}
                      </p>
                      <p className="text-xs text-[var(--muted_text)]">
                        {attachment.mime_type}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveAttachment(attachment.file_path)
                      }
                      className="rounded-full border border-[var(--primary_accent)] px-3 py-1 text-xs font-semibold text-[var(--primary_accent)] transition-colors hover:border-[var(--titles)] hover:text-[var(--titles)]"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              onClick={() => setSubmitPhase("published")}
              disabled={isSubmitting || isUploadingAttachments}
              className="shadow-soft-xs rounded-full bg-[var(--primary_accent)] px-6 py-3 text-sm font-semibold text-[var(--inverse_text)] transition-colors hover:bg-[var(--titles)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Publish
            </button>

            <button
              type="submit"
              onClick={() => setSubmitPhase("draft")}
              disabled={isSubmitting || isUploadingAttachments}
              className="rounded-full border border-[var(--border_on_surface_soft)] px-6 py-3 text-sm font-semibold text-[var(--titles)] transition-colors hover:border-[var(--titles)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Save as draft
            </button>

            <Link
              href="/me"
              className="rounded-full border border-[var(--border_on_surface_soft)] px-6 py-3 text-sm font-semibold text-[var(--titles)] transition-colors hover:border-[var(--titles)]"
            >
              Discard
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
