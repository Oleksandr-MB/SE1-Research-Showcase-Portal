"use client";

import Link from "next/link";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { UserRead, ProfileUpdatePayload } from "@/lib/api";
import { getCurrentUser, updateProfile } from "@/lib/api";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

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
  isProfilePublic: boolean;
  isOrcidPublic: boolean;
  isSocialsPublic: boolean;
  isArxivPublic: boolean;
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
  isProfilePublic: true,
  isOrcidPublic: true,
  isSocialsPublic: true,
  isArxivPublic: true,
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
  description 
}: {
  name: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--surface_muted)] transition-colors duration-200">
      <div className="relative flex items-center h-5 mt-0.5">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-4 h-4 border border-[var(--border_on_surface_soft)] rounded-[4px] bg-[var(--surface_primary)] 
          peer-checked:bg-[var(--primary_accent)] peer-checked:border-[var(--primary_accent)]
          transition-all duration-200 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" 
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[var(--titles)]">{label}</span>
        <p className="text-xs text-[var(--muted_text_soft)] mt-0.5">{description}</p>
      </div>
    </label>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen pt-16 pb-24 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-[var(--surface_muted)] rounded-lg"></div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-[var(--surface_muted)] rounded-2xl"></div>
              <div className="grid md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-[var(--surface_muted)] rounded-xl"></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-[var(--surface_muted)] rounded-xl"></div>
              <div className="h-40 bg-[var(--surface_muted)] rounded-xl"></div>
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
          isProfilePublic: currentUser.is_profile_public ?? true,
          isOrcidPublic: currentUser.is_orcid_public ?? true,
          isSocialsPublic: currentUser.is_socials_public ?? true,
          isArxivPublic: currentUser.is_arxiv_public ?? true,
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
    is_profile_public: form.isProfilePublic,
    is_orcid_public: form.isOrcidPublic,
    is_socials_public: form.isSocialsPublic,
    is_arxiv_public: form.isArxivPublic,
};

    try {
      setIsSaving(true);
      const updated = await updateProfile(token, payload);
      setUser(updated);
      setSaveSuccess(true);
      
      // Сбрасываем успешное сообщение через 3 секунды
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen pt-16 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[var(--page_background)] to-[var(--surface_muted)] animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="h1-apple">Edit Profile</h1>
              <p className="caption-apple mt-2 max-w-2xl">
                Customize how others see you on Research Showcase Portal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/${user.username}`}>
                <Button variant="outline" size="md">
                  View Public Profile
                </Button>
              </Link>
              <Link href="/posts/new">
                <Button variant="primary" size="md">
                  New Post
                </Button>
              </Link>
            </div>
          </div>
          <div className="divider-subtle mt-6"></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form - 2/3 ширины */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] p-6 sm:p-8 shadow-soft-sm hover-lift">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <section>
                  <h2 className="h3-apple mb-6 text-[var(--titles)]">Basic Information</h2>
                  <div className="grid md:grid-cols-2 gap-6">
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
                    <label className="block text-sm font-medium text-[var(--titles)] mb-2">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-sm text-[var(--normal_text)] 
                        outline-none placeholder:text-[var(--placeholder_text)] transition-all duration-200
                        focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[var(--ring_on_surface)] focus:ring-offset-2"
                      placeholder="Tell others about your research interests and current projects..."
                    />
                  </div>
                </section>

                {/* Academic Profiles */}
                <section>
                  <h2 className="h3-apple mb-6 text-[var(--titles)]">Academic Profiles</h2>
                  <div className="grid md:grid-cols-2 gap-6">
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

                {/* Social Links */}
                <section>
                  <h2 className="h3-apple mb-6 text-[var(--titles)]">Social Links</h2>
                  <div className="grid md:grid-cols-2 gap-6">
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

                {/* Privacy Settings */}
                <section>
                  <h2 className="h3-apple mb-6 text-[var(--titles)]">Privacy Settings</h2>
                  <div className="rounded-xl border border-[var(--border_on_surface_soft)] p-2 space-y-1">
                    <PrivacyCheckbox
                      name="isProfilePublic"
                      checked={form.isProfilePublic}
                      onChange={handleCheckboxChange}
                      label="Make my profile public"
                      description="When disabled, only your username may appear publicly"
                    />
                    <PrivacyCheckbox
                      name="isOrcidPublic"
                      checked={form.isOrcidPublic}
                      onChange={handleCheckboxChange}
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
                  </div>
                </section>

                {/* Submit Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-[var(--border_on_surface_soft)]">
                  <div className="flex items-center gap-4">
                    <Button type="submit" loading={isSaving} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    {saveSuccess && (
                      <div className="flex items-center gap-2 text-sm text-[var(--primary_accent)] animate-scale-in">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Profile updated
                      </div>
                    )}
                  </div>
                  {saveError && (
                    <p className="text-sm text-[#DC2626] flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {saveError}
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar - 1/3 ширины */}
          <div className="space-y-6">
            {/* Account Summary */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] p-6 shadow-soft-sm">
              <h3 className="h3-apple mb-4 text-[var(--titles)]">Account Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted_text)]">Username</span>
                  <span className="font-medium text-[var(--titles)]">{user.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted_text)]">Email</span>
                  <span className="text-sm text-[var(--titles)] truncate max-w-[160px]">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted_text)]">Role</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-[var(--surface_secondary)] to-transparent text-[var(--titles)]">
                    {roleLabel(user.role)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted_text)]">Member since</span>
                  <span className="text-sm text-[var(--titles)]">{formatJoinedDate(user.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] p-6 shadow-soft-sm">
              <h3 className="h3-apple mb-4 text-[var(--titles)]">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/posts/new" className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface_muted)] transition-colors group">
                  <span className="text-sm font-medium text-[var(--titles)]">Create New Post</span>
                  <svg className="w-4 h-4 text-[var(--muted_text)] group-hover:text-[var(--primary_accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
                <Link href={`/search?author=${user.username}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface_muted)] transition-colors group">
                  <span className="text-sm font-medium text-[var(--titles)]">View My Posts</span>
                  <svg className="w-4 h-4 text-[var(--muted_text)] group-hover:text-[var(--primary_accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link href="/logout" className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface_muted)] transition-colors group">
                  <span className="text-sm font-medium text-[#DC2626]">Log Out</span>
                  <svg className="w-4 h-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}