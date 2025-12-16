"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPost,
  type CreatePostPayload,
  uploadPostAttachment,
  type AttachmentUploadResponse,
  searchPosts,
  getCurrentUser,
  type UserRead,
} from "@/lib/api";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  CheckCircleSolidIcon,
  DocumentTextIcon,
  TagIcon,
  XCircleSolidIcon,
  XMarkIcon,
} from "@/components/icons";

type FormState = {
  title: string;
  abstract: string;
  authorsText: string;
  body: string;
  bibtex: string;
  tags: string;
};

const initialState: FormState = {
  title: "",
  abstract: "",
  authorsText: "",
  body: "",
  bibtex: "",
  tags: "",
};

const splitTags = (raw: string): string[] =>
  raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

export default function NewPostPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [isTagLoading, setIsTagLoading] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentUploadResponse[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("rsp_token");
    if (!stored) {
      router.replace("/login?next=/posts/new");
      return;
    }
    
    setToken(stored);
    
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser(stored);
        setCurrentUser(user);
        
        if (user) {
          const authorName = user.display_name || user.username;
          
          setForm(prev => ({
            ...prev,
            authorsText: authorName
          }));
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch current user";
        const unauthorized = message.includes("(401)");

        if (unauthorized) {
          localStorage.removeItem("rsp_token");
          setToken(null);
          setError("Your session has expired. Please sign in again.");
          router.replace("/login?next=/posts/new");
          return;
        }

        console.error("Failed to fetch current user", error);
        setError("Unable to verify your session. Please try again.");
      } finally {
        setCheckingAuth(false);
      }
    };
    
    fetchCurrentUser();
  }, [router]);

  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, tags: value }));

    const parts = value.split(",");
    const currentFragment = parts[parts.length - 1].trim();

    if (!currentFragment || currentFragment.length < 2) {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
      return;
    }

    try {
      setIsTagLoading(true);
      const results = await searchPosts(currentFragment);
      const allTags = new Set<string>();
      const existingTags = new Set(splitTags(value).map((t) => t.toLowerCase()));

      for (const post of results) {
        (post.tags || []).forEach((tag) => {
          if (
            tag.toLowerCase().includes(currentFragment.toLowerCase()) &&
            !existingTags.has(tag.toLowerCase())
          ) {
            allTags.add(tag);
          }
        });
      }

      const suggestions = Array.from(allTags).slice(0, 8);
      setTagSuggestions(suggestions);
      setShowTagSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error("Error loading tag suggestions", error);
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    } finally {
      setIsTagLoading(false);
    }
  };

  const handleAddTagFromSuggestion = (tag: string) => {
    const parts = form.tags.split(",");
    if (parts.length === 0) {
      setForm((prev) => ({ ...prev, tags: tag }));
    } else {
      parts[parts.length - 1] = ` ${tag}`;
      const next = parts
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .join(", ");
      setForm((prev) => ({ ...prev, tags: next }));
    }
    setTagSuggestions([]);
    setShowTagSuggestions(false);
  };

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const files = event.target.files;
    if (!files || files.length === 0) return;
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
      setAttachmentError(uploadError instanceof Error ? uploadError.message : "Failed to upload attachments.");
    } finally {
      setIsUploadingAttachments(false);
      event.target.value = "";
    }
  };

  const handleRemoveAttachment = (filePath: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.file_path !== filePath));
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

    if (!trimmedTitle || !trimmedAbstract || !trimmedBody) {
      setError("Title, abstract, and body are required.");
      return;
    }

    let finalAuthorsText = trimmedAuthors;
    if (!trimmedAuthors && currentUser) {
      const authorName = currentUser.display_name || currentUser.username;
      const affiliation = currentUser.affiliation ? `, ${currentUser.affiliation}` : '';
      finalAuthorsText = `${authorName}${affiliation}`;
    }

    const tags = splitTags(form.tags);
    const sanitizedAttachments =
      attachments.length > 0
        ? attachments
            .map(({ file_path }) => file_path?.trim())
            .filter((path): path is string => Boolean(path))
        : [];
    const attachmentPayload =
      sanitizedAttachments.length > 0 ? sanitizedAttachments : undefined;

    const payload: CreatePostPayload = {
      title: trimmedTitle,
      abstract: trimmedAbstract,
      authors_text: finalAuthorsText,
      body: trimmedBody,
      bibtex: form.bibtex.trim() || undefined,
      tags: tags.length ? tags : undefined,
      attachments: attachmentPayload,
    };

    setIsSubmitting(true);

    try {
      await createPost(token, payload);
      setSuccess("Post published. Redirecting to the main page...");
      setForm(initialState);
      setAttachments([]);
      redirectTimeout.current = setTimeout(() => router.push("/"), 1400);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Something went wrong while creating the post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F5F5F5] to-[#F3F3F3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--DarkGray)] mx-auto mb-4"></div>
          <p className="text-sm text-[var(--Gray)]">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F5F5] to-[#F3F3F3] px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="mb-8 rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="h1-apple text-[var(--DarkGray)]">Create New Post</h1>
              <p className="body-apple mt-2 max-w-2xl text-[var(--Gray)]">
                Share your research with the community.
              </p>
            </div>
            <Link href="/me">
              <Button variant="primary" size="md">
                Back to your lab
              </Button>
            </Link>
          </div>
          <div className="divider-subtle"></div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[#E5E5E5] bg-[var(--White)] p-6 sm:p-8 shadow-soft-sm">
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-red-700">
                      <XCircleSolidIcon className="w-4 h-4" />
                      {error}
                    </div>
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 animate-scale-in">
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircleSolidIcon className="w-4 h-4" />
                      {success}
                    </div>
                  </div>
                )}

                {/* Title & Authors */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Title"
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    placeholder="Give your research a concise title"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                      Author
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[var(--LightGray)] flex items-center justify-center">
                        <span className="text-sm font-medium text-[var(--DarkGray)]">
                          {currentUser?.username?.[0].toUpperCase() || "A"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <input
                          name="authorsText"
                          value={form.authorsText}
                          onChange={handleInputChange}
                          className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                            outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                            focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                          placeholder="List the contributing authors"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#8A8A8A] mt-1">
                      Based on your profile. You can add co-authors separated by commas.
                    </p>
                  </div>
                </div>

                {/* Abstract */}
                <div>
                  <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                    Abstract
                  </label>
                  <textarea
                    required
                    name="abstract"
                    value={form.abstract}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                      outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                      focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                    placeholder="Summarize your contribution..."
                  />
                </div>

                {/* Full Body */}
                <div>
                  <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                    Full Body
                  </label>
                  <textarea
                    required
                    name="body"
                    value={form.body}
                    onChange={handleInputChange}
                    rows={12}
                    className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                      outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                      focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                    placeholder="Include the details, results, and discussion..."
                  />
                </div>

                {/* BibTeX & Tags */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                      BibTeX Reference (Optional)
                    </label>
                    <textarea
                      name="bibtex"
                      value={form.bibtex}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                        outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                        focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                      placeholder="@article{...}"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                      Tags (comma separated)
                    </label>
                    <div className="relative">
                      <input
                        name="tags"
                        value={form.tags}
                        onChange={handleTagsChange}
                        onFocus={() => tagSuggestions.length > 0 && setShowTagSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                        className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                          outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                          focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                        placeholder="neuroscience, robotics, ai"
                      />
                      
                      {showTagSuggestions && (
                        <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#E5E5E5] bg-[var(--White)] shadow-soft-lg">
                          {isTagLoading && tagSuggestions.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-[var(--Gray)]">
                              Searching tags…
                            </div>
                          ) : (
                            <>
                              {tagSuggestions.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleAddTagFromSuggestion(tag);
                                  }}
                                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[var(--DarkGray)] hover:bg-[#F3F3F3] transition-colors"
                                >
                                  <span className="flex items-center gap-2">
                                    <TagIcon className="w-3 h-3 text-[#8A8A8A]" />
                                    {tag}
                                  </span>
                                  <span className="text-xs text-[#8A8A8A]">
                                    Add
                                  </span>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                    Attachments (Optional)
                  </label>
                  <div className="rounded-2xl border border-[#E5E5E5] bg-[var(--White)] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--DarkGray)]">Upload Files</p>
                        <p className="text-xs text-[#8A8A8A] mt-1">
                          Supports PDF, images, datasets (max 50MB each)
                        </p>
                      </div>
                      <label className="inline-block">
                        <span className="px-4 py-2.5 text-sm font-medium rounded-full bg-gradient-to-br from-[#F7F7F7] to-transparent text-[var(--DarkGray)] hover:bg-[#F3F3F3] transition-colors duration-200 cursor-pointer border border-[#E5E5E5]">
                          Choose Files
                        </span>
                        <input
                          type="file"
                          multiple
                          onChange={handleAttachmentChange}
                          disabled={isUploadingAttachments}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {isUploadingAttachments && (
                      <div className="flex items-center gap-2 text-sm text-[var(--Gray)] p-3 rounded-lg bg-[#F3F3F3]">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--DarkGray)]"></div>
                        Uploading attachments...
                      </div>
                    )}

                    {attachmentError && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-sm text-red-700">{attachmentError}</p>
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <h4 className="text-sm font-medium text-[var(--DarkGray)]">Selected Files</h4>
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.file_path}
                            className="group flex items-center justify-between p-3 rounded-xl border border-[#E5E5E5] hover:border-[var(--DarkGray)] bg-[#F3F3F3] hover:bg-[var(--White)] transition-all duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-gradient-to-br from-[#F7F7F7] to-transparent">
                                <DocumentTextIcon className="w-4 h-4 text-[var(--DarkGray)]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[var(--DarkGray)] truncate max-w-[200px]">
                                  {attachment.original_filename}
                                </p>
                                <p className="text-xs text-[#8A8A8A]">
                                  {attachment.mime_type} · {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(attachment.file_path)}
                              className="p-1.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-[#E5E5E5]">
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    disabled={isSubmitting || isUploadingAttachments}
                  >
                    Publish Post
                  </Button>
                  
                  <Link href="/me">
                    <Button variant="ghost">
                      Discard
                    </Button>
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tips */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-gradient-to-b from-[var(--White)] to-transparent p-6 shadow-soft-sm">
              <div className="flex items-center gap-3 mb-4 text-center justify-center">
                <h3 className="h3-apple text-[var(--DarkGray)]">Tips</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <CheckCircleSolidIcon className="w-4 h-4 text-[var(--DarkGray)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--DarkGray)]">Clear Title</p>
                    <p className="text-xs text-[var(--Gray)]">Make it specific and descriptive</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <CheckCircleSolidIcon className="w-4 h-4 text-[var(--DarkGray)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--DarkGray)]">Tags</p>
                    <p className="text-xs text-[var(--Gray)]">Use relevant tags to increase discoverability</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <CheckCircleSolidIcon className="w-4 h-4 text-[var(--DarkGray)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--DarkGray)]">Attachments</p>
                    <p className="text-xs text-[var(--Gray)]">Add supplementary materials and data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <CheckCircleSolidIcon className="w-4 h-4 text-[var(--DarkGray)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--DarkGray)]">Authors</p>
                    <p className="text-xs text-[var(--Gray)]">Your name is automatically added. Add co-authors separated by commas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
