"use client";

import Link from "next/link";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { UserRead, ProfileUpdatePayload } from "@/lib/api";
import { getCurrentUser, updateProfile } from "@/lib/api";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import {
  ChevronRightIcon,
  CheckSolidIcon,
  LogoutIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserIcon,
  XCircleSolidIcon,
  XMarkIcon,
} from "@/components/icons";

type ProfileFormState = {
  displayName: string;
  bio: string;
  affiliation: string;
  orcid: string;
  arxiv: string;
  website: string;
  twitter: string;
  github: string;
  linkedin: string;
  isOrcidPublic: boolean;
  isSocialsPublic: boolean;
  isArxivPublic: boolean;
  isEmailPublic: boolean;
};

const emptyForm: ProfileFormState = {
  displayName: "",
  bio: "",
  affiliation: "",
  orcid: "",
  arxiv: "",
  website: "",
  twitter: "",
  github: "",
  linkedin: "",
  isOrcidPublic: true,
  isSocialsPublic: true,
  isArxivPublic: true,
  isEmailPublic: false,
};

function formatJoinedDate(createdAt: string | undefined) {
  if (!createdAt) return "Unknown member since";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown member since";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
}

function roleLabel(role: UserRead["role"]) {
  const labels: Record<string, string> = {
    researcher: "Researcher",
    moderator: "Moderator",
    admin: "Administrator",
  };

  if (!role) {
    return "Registered user";
  }

  return labels[String(role)] ?? "Registered user";
}

function PrivacyCheckbox({
  name,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl px-3 py-2 transition-colors duration-200 hover:bg-[var(--LightGray)]/60">
      <div className="relative mt-0.5 flex h-5 items-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-[var(--LightGray)] bg-[var(--White)] transition-colors duration-200"
        >
          {!checked && (
            <XMarkIcon className="h-3 w-3 text-[var(--DarkGray)]" strokeWidth={3} />
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-[var(--DarkGray)]">{label}</span>
        <p className="mt-0.5 text-xs text-[var(--Gray)]">{description}</p>
      </div>
    </label>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-7xl">
        <div className="space-y-6">
          <div className="h-8 w-64 rounded-lg bg-[var(--LightGray)]/60"></div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="h-48 rounded-3xl bg-[var(--LightGray)]/60"></div>
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 rounded-2xl bg-[var(--LightGray)]/60"></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-32 rounded-2xl bg-[var(--LightGray)]/60"></div>
              <div className="h-40 rounded-2xl bg-[var(--LightGray)]/60"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PersonalLab() {
  const router = useRouter();
  const [user, setUser] = useState<UserRead | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      const token = localStorage.getItem("rsp_token");
      if (!token) {
        router.replace("/login?next=/me/profile");
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        if (!isMounted) return;

        setUser(currentUser);
        setForm({
          displayName: currentUser.display_name || currentUser.username || "",
          bio: currentUser.bio || "",
          affiliation: currentUser.affiliation || "",
          orcid: currentUser.orcid || "",
          arxiv: currentUser.arxiv || "",
          website: currentUser.website || "",
          twitter: currentUser.twitter || "",
          github: currentUser.github || "",
          linkedin: currentUser.linkedin || "",
          isOrcidPublic: currentUser.is_orcid_public ?? true,
          isSocialsPublic: currentUser.is_socials_public ?? true,
          isArxivPublic: currentUser.is_arxiv_public ?? true,
          isEmailPublic: currentUser.is_email_public ?? false,
        });
      } catch (error) {
        console.error("Unable to load current user", error);
        localStorage.removeItem("rsp_token");
        router.replace("/login?next=/me/profile");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, [router]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const token = localStorage.getItem("rsp_token");
    if (!token) {
      router.replace("/login?next=/me/profile");
      return;
    }

    const payload: ProfileUpdatePayload = {
      display_name: form.displayName.trim() || undefined,
      bio: form.bio.trim() || undefined,
      affiliation: form.affiliation.trim() || undefined,
      orcid: form.orcid.trim() || undefined,
      arxiv: form.arxiv.trim() || undefined,
      website: form.website.trim() || undefined,
      twitter: form.twitter.trim() || undefined,
      github: form.github.trim() || undefined,
      linkedin: form.linkedin.trim() || undefined,
      is_orcid_public: form.isOrcidPublic,
      is_socials_public: form.isSocialsPublic,
      is_arxiv_public: form.isArxivPublic,
      is_email_public: form.isEmailPublic,
    };

    try {
      setIsSaving(true);
      const updated = await updateProfile(token, payload);
      setUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      const fallbackMessage = "Failed to update profile. Please try again.";
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : fallbackMessage;
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="h1-apple text-[var(--DarkGray)]">Edit Profile</h1>
              <p className="caption-apple max-w-2xl text-[var(--Gray)]">
                Customize how others see you on Research Showcase Portal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/me`}>
                <Button variant="outline" size="md">
                  Back to profile
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <section>
                <h2 className="h3-apple mb-6 text-[var(--DarkGray)]">Basic Information</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <Input
                    label="Display Name"
                    name="displayName"
                    value={form.displayName}
                    onChange={handleInputChange}
                    placeholder={user.username}
                    helperText="Your public-facing name"
                  />
                  <Input
                    label="Affiliation"
                    name="affiliation"
                    value={form.affiliation}
                    onChange={handleInputChange}
                    placeholder="University / Lab / Organization"
                  />
                </div>
                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-[var(--DarkGray)]">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] outline-none placeholder:text-[var(--Gray)] transition-all duration-200 focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                    placeholder="Tell others about your research interests and current projects..."
                  />
                </div>
              </section>

              <section>
                <h2 className="h3-apple mb-6 text-[var(--DarkGray)]">Academic Profiles</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <Input
                    label="ORCID iD"
                    name="orcid"
                    value={form.orcid}
                    onChange={handleInputChange}
                    placeholder="0000-0000-0000-0000"
                    helperText="Your unique researcher identifier"
                  />
                  <Input
                    label="arXiv Profile"
                    name="arxiv"
                    value={form.arxiv}
                    onChange={handleInputChange}
                    placeholder="arxiv.org/a/your_name"
                  />
                </div>
              </section>

              <section>
                <h2 className="h3-apple mb-6 text-[var(--DarkGray)]">Social Links</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <Input
                    label="Personal Website"
                    name="website"
                    value={form.website}
                    onChange={handleInputChange}
                    placeholder="https://your-website.com"
                  />
                  <Input
                    label="GitHub"
                    name="github"
                    value={form.github}
                    onChange={handleInputChange}
                    placeholder="github.com/username"
                  />
                  <Input
                    label="LinkedIn"
                    name="linkedin"
                    value={form.linkedin}
                    onChange={handleInputChange}
                    placeholder="linkedin.com/in/username"
                  />
                  <Input
                    label="Twitter / X"
                    name="twitter"
                    value={form.twitter}
                    onChange={handleInputChange}
                    placeholder="@username"
                  />
                </div>
              </section>

              <section>
                <h2 className="h3-apple mb-6 text-[var(--DarkGray)]">Privacy Settings</h2>
                <div className="rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] p-2">
                  <PrivacyCheckbox
                    name="isOrcidPublic"
                    checked={form.isOrcidPublic}
                    onChange={(e) => {
                      handleCheckboxChange(e);
                      setForm((prev) => ({ ...prev, isArxivPublic: e.target.checked }));
                    }}
                    label="Show ORCID and arXiv profiles"
                    description="Display your academic identifiers on your public profile"
                  />
                  <PrivacyCheckbox
                    name="isSocialsPublic"
                    checked={form.isSocialsPublic}
                    onChange={handleCheckboxChange}
                    label="Show social links"
                    description="Display website and social media links"
                  />
                  <PrivacyCheckbox
                    name="isEmailPublic"
                    checked={form.isEmailPublic}
                    onChange={handleCheckboxChange}
                    label="Show my email on my public profile"
                    description="Email is hidden by default"
                  />
                </div>
              </section>

              <div className="flex flex-col gap-4 border-t border-[var(--LightGray)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Button type="submit" loading={isSaving} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  {saveSuccess && (
                    <div className="flex items-center gap-2 text-sm text-[var(--DarkGray)] animate-scale-in">
                      <CheckSolidIcon className="h-4 w-4" />
                      Profile updated
                    </div>
                  )}
                </div>
                {saveError && (
                  <p className="flex items-center gap-2 text-sm text-[var(--Red)]">
                    <XCircleSolidIcon className="h-4 w-4" />
                    {saveError}
                  </p>
                )}
              </div>
            </form>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <h3 className="h3-apple mb-4 text-[var(--DarkGray)]">Account Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--Gray)]">Username</span>
                  <span className="font-medium text-[var(--DarkGray)]">{user.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--Gray)]">Email</span>
                  <span className="max-w-[180px] truncate text-sm text-[var(--DarkGray)]">{user.email}</span>
                  
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--Gray)]">Role</span>
                  <span className="inline-flex items-center rounded-full border border-[var(--LightGray)] px-3 py-1 text-xs font-medium text-[var(--DarkGray)]">
                    {roleLabel(user.role)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--Gray)]">Member since</span>
                  <span className="text-sm text-[var(--DarkGray)]">{formatJoinedDate(user.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <h3 className="h3-apple text-[var(--DarkGray)]">Quick Actions</h3>
              <div className="mt-4 space-y-3">
                <Link
                  href="/posts/new"
                  className="group flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 shadow-soft-xs transition-all duration-200 hover:border-[var(--DarkGray)] hover:bg-[var(--LightGray)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--LightGray)] text-[var(--DarkGray)] transition-colors duration-200 group-hover:bg-[var(--DarkGray)] group-hover:text-[var(--White)]">
                      <PlusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--DarkGray)]">
                        Create Post
                      </p>
                      <p className="text-xs text-[var(--Gray)]">Share a new study with the portal.</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-[var(--Gray)] transition-colors duration-200 group-hover:text-[var(--DarkGray)]" />
                </Link>
                <Link
                  href="/"
                  className="group flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 shadow-soft-xs transition-all duration-200 hover:border-[var(--DarkGray)] hover:bg-[var(--LightGray)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--LightGray)] text-[var(--DarkGray)] transition-colors duration-200 group-hover:bg-[var(--DarkGray)] group-hover:text-[var(--White)]">
                      <MagnifyingGlassIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--DarkGray)]">
                        Browse Research
                      </p>
                      <p className="text-xs text-[var(--Gray)]">Jump directly to the search filters.</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-[var(--Gray)] transition-colors duration-200 group-hover:text-[var(--DarkGray)]" />
                </Link>
                <Link
                  href="/me"
                  className="group flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 shadow-soft-xs transition-all duration-200 hover:border-[var(--DarkGray)] hover:bg-[var(--LightGray)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--LightGray)] text-[var(--DarkGray)] transition-colors duration-200 group-hover:bg-[var(--DarkGray)] group-hover:text-[var(--White)]">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--DarkGray)]">
                        My Profile
                      </p>
                      <p className="text-xs text-[var(--Gray)]">Review your contributions and stats.</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-[var(--Gray)] transition-colors duration-200 group-hover:text-[var(--DarkGray)]" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <Link
                href="/logout"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--Red)] px-4 py-3 text-sm font-semibold text-[var(--White)] transition-colors duration-200"
              >
                <LogoutIcon className="h-4 w-4" />
                Log Out
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--Gray)]">
                Signed in as <span className="font-medium text-[var(--DarkGray)]">{user.username}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
