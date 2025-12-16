import { BadgeCheckSolidIcon } from "@/components/icons";

export default function VerifiedResearcherBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--Blue)] px-2.5 py-0.5 text-xs font-medium text-[var(--White)] border-[var(--Blue)]">
      <BadgeCheckSolidIcon className="h-3.5 w-3.5" />
      Verified Researcher
    </span>
  );
}
