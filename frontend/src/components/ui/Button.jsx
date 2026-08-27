import { Link } from 'react-router-dom';

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-primary/30 bg-background text-primary hover:bg-primary/5',
  ghost: 'text-foreground hover:bg-secondary',
};

const sizes = {
  default: 'h-10 px-4 text-sm',
  lg: 'h-12 px-7 text-base',
};

export function Button({ variant = 'default', size = 'default', to, className = '', children, ...props }) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}