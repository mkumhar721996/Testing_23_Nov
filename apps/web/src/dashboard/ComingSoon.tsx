import type { ReactNode } from 'react';

export type ComingSoonVariant = 'nav' | 'menu' | 'secondary' | 'primary' | 'link';

const classes: Record<ComingSoonVariant, string> = {
  nav: 'nav-link',
  menu: 'dropdown-item',
  secondary: 'btn btn-secondary soon',
  primary: 'btn btn-primary soon',
  link: 'link-soon',
};

interface ComingSoonProps {
  variant: ComingSoonVariant;
  children: ReactNode;
}

// A deferred feature: aria-disabled (not `disabled`) keeps it focusable so the label is read.
export function ComingSoon({ variant, children }: ComingSoonProps) {
  const label = (
    <>
      {children} <span className="badge badge-soon">Coming soon</span>
    </>
  );
  if (variant === 'link') {
    return (
      <a
        role="link"
        tabIndex={0}
        className={classes.link}
        aria-disabled="true"
        onClick={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
      >
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      role={variant === 'menu' ? 'menuitem' : undefined}
      className={classes[variant]}
      aria-disabled="true"
      onClick={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
