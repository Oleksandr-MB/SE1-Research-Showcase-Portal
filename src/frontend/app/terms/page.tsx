import { Button } from "@/components/Button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="h2-apple text-[var(--DarkGray)]">
                Terms &amp; Community Guidelines
              </h1>
            </div>
            <Button href="/" className="shrink-0 text-sm font-semibold" variant="primary">
              Back to home
            </Button>
          </div>

          <div className="mt-6 space-y-6 text-sm text-[var(--DarkGray)]">
            <section className="space-y-2">
              <h2 className="text-base font-semibold">Respectful communication</h2>
              <ul className="list-disc space-y-1 pl-6 text-[var(--Gray)]">
                <li>No harassment, hate speech, or personal attacks.</li>
                <li>Avoid profanity and inflammatory language.</li>
                <li>Discuss ideas and research, not people.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Academic integrity</h2>
              <ul className="list-disc space-y-1 pl-6 text-[var(--Gray)]">
                <li>No plagiarism. Do not submit others&apos; work as your own.</li>
                <li>If you build on existing work, clearly attribute it (citations, links, or BibTeX where appropriate).</li>
                <li>Mark reused figures, datasets, or text, and ensure you have permission to share them.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Content safety</h2>
              <ul className="list-disc space-y-1 pl-6 text-[var(--Gray)]">
                <li>Do not upload malware, exploits, or harmful content.</li>
                <li>Do not share personal data without consent.</li>
                <li>Do not post illegal content or material that infringes copyright.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Moderation</h2>
              <ul className="list-disc space-y-1 pl-6 text-[var(--Gray)]">
                <li>Reported content may be reviewed by moderators.</li>
                <li>We may remove content or accounts that violate these guidelines.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Disclaimer!</h2>
              <p className="text-[var(--Gray)]">
                This is a student project not intended for commercial and (or) professional use; the listed guidelines are informational.<br />Users are
                responsible for the content they publish.
              </p>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
