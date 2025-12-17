import type { SVGProps } from "react";

export type BaseIconProps = Omit<SVGProps<SVGSVGElement>, "children">;

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

