import { BadgeCheckSolidIcon } from "@/components/icons";

export default function VerifiedResearcherBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 border border-blue-200">
      <BadgeCheckSolidIcon className="h-3.5 w-3.5" />
      Verified Researcher
    </span>
  );
}
