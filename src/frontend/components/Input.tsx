"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

export function Input({ label, helperText, className = '', ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-[var(--titles)]">
          {label}
        </span>
      )}
      <input
        className={`
          rounded-2xl border border-[var(--border_on_surface_soft)] 
          bg-[var(--surface_primary)] px-4 py-2.5 text-sm 
          text-[var(--normal_text)] outline-none 
          placeholder:text-[var(--placeholder_text)]
          transition-all duration-200 ease-apple
          focus:border-[var(--primary_accent)]
          focus:ring-2 focus:ring-[var(--ring_on_surface)]
          focus:ring-offset-2
          ${className}
        `}
        {...props}
      />
      {helperText && (
        <p className="text-xs text-[var(--muted_text_soft)] mt-1">
          {helperText}
        </p>
      )}
    </label>
  );
}