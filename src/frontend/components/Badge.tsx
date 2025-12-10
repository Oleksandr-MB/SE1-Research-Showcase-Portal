interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'secondary';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200';
  
  const variants = {
    default: 'bg-[#F3F3F3] text-[var(--Gray)]',
    accent: 'bg-[var(--DarkGray)] text-[var(--White)]',
    secondary: 'bg-[#F7F7F7] text-[var(--DarkGray)] border border-[#E5E5E5]',
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
