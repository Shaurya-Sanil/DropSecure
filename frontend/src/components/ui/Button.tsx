import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent',
      secondary: 'bg-canvas-raised text-fg border border-border hover:bg-canvas-overlay active:bg-canvas-surface',
      outline: 'bg-transparent text-fg border border-border hover:bg-canvas-surface active:bg-canvas-raised',
      danger: 'bg-status-danger text-white hover:opacity-90 active:opacity-80',
      ghost: 'bg-transparent text-fg-muted hover:text-fg hover:bg-canvas-surface active:bg-canvas-raised',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 h-7',
      md: 'text-sm px-3.5 py-2 h-9',
      lg: 'text-base px-5 py-2.5 h-11',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
