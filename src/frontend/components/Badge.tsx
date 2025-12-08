interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'secondary';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200';
  
  const variants = {
    default: 'bg-[var(--surface_muted)] text-[var(--muted_text)]',
    accent: 'bg-gradient-to-r from-[var(--primary_accent)] to-[var(--DarkRedLight)] text-white',
    secondary: 'bg-[var(--surface_secondary)] text-[var(--titles)]',
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}