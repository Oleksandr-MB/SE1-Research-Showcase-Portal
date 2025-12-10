interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
}

export function Textarea({ label, helperText, className = '', ...props }: TextareaProps) {
  return (
    <label className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-[var(--DarkGray)]">
          {label}
        </span>
      )}
      <textarea
        className={`
          rounded-2xl border border-[#E5E5E5] 
          bg-[var(--White)] px-4 py-3 text-sm 
          text-[var(--DarkGray)] outline-none 
          placeholder:text-[#9F9F9F]
          transition-all duration-200 ease-apple
          focus:border-[var(--DarkGray)]
          focus:ring-2 focus:ring-[rgba(55,55,55,0.15)]
          focus:ring-offset-2
          ${className}
        `}
        {...props}
      />
      {helperText && (
        <p className="text-xs text-[#8A8A8A] mt-1">
          {helperText}
        </p>
      )}
    </label>
  );
}