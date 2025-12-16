"use client";

import Link from "next/link";
import { SpinnerIcon } from "@/components/icons";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  href?: string;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  href,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-all duration-300 ease-apple rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary: "bg-[var(--DarkGray)] text-[var(--White)] border border-transparent hover:bg-[var(--Black)]",
    secondary: "bg-[#F7F7F7] text-[var(--DarkGray)] border border-[#E5E5E5] hover:border-[var(--DarkGray)]",
    outline: "bg-transparent text-[var(--DarkGray)] border border-[#E5E5E5] hover:border-[var(--DarkGray)]",
    ghost: "bg-transparent text-[var(--DarkGray)] hover:bg-[#F3F3F3]",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const combinedClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${
    disabled || loading ? "opacity-60 cursor-not-allowed" : ""
  }`;

  const content = (
    <>
      {loading && (
        <SpinnerIcon className="animate-spin -ml-1 mr-2" />
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
