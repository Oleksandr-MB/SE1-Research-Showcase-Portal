import type { BaseIconProps } from "./shared";
import { cx } from "./shared";

export type VoteIconSize = "s" | "l";

const sizeClass: Record<VoteIconSize, string> = {
  s: "h-4 w-4",
  l: "h-5 w-5",
};

type VoteArrowIconProps = BaseIconProps & {
  direction: "up" | "down";
  size?: VoteIconSize;
};

function VoteArrowIcon({
  direction,
  size = "s",
  className,
  ...props
}: VoteArrowIconProps) {
  return (
    <svg
      className={cx(sizeClass[size], "inline-block text-current", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {direction === "up" ? (
        <path d="M5 15l7-7 7 7" />
      ) : (
        <path d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

export type VoteIconProps = Omit<VoteArrowIconProps, "direction">;

export function UpvoteIcon(props: VoteIconProps) {
  return <VoteArrowIcon direction="up" {...props} />;
}

export function DownvoteIcon(props: VoteIconProps) {
  return <VoteArrowIcon direction="down" {...props} />;
}

