import React from 'react';
import { cn } from '@/lib/utils';

interface ModernLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'narrow' | 'normal' | 'wide' | 'full';
  padding?: 'none' | 'small' | 'normal' | 'large';
}

export function ModernLayout({ 
  children, 
  className,
  maxWidth = 'normal',
  padding = 'normal'
}: ModernLayoutProps) {
  const containerClasses = {
    narrow: 'container-narrow',
    normal: 'container-modern', 
    wide: 'container-wide',
    full: 'w-full px-4 sm:px-6 lg:px-8'
  };

  const paddingClasses = {
    none: '',
    small: 'py-4',
    normal: 'py-6 sm:py-8',
    large: 'py-8 sm:py-12'
  };

  return (
    <div className={cn(
      containerClasses[maxWidth],
      paddingClasses[padding],
      'animate-fade-in',
      className
    )}>
      {children}
    </div>
  );
}

interface ModernPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function ModernPageHeader({ 
  title, 
  subtitle, 
  action, 
  badge,
  className 
}: ModernPageHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8',
      className
    )}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-heading-1 text-foreground">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-body">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'normal' | 'large';
  hover?: boolean;
}

export function ModernCard({ 
  children, 
  className,
  padding = 'normal',
  hover = true
}: ModernCardProps) {
  const paddingClasses = {
    none: '',
    small: 'p-4',
    normal: 'p-6',
    large: 'p-8'
  };

  return (
    <div className={cn(
      'card-modern',
      paddingClasses[padding],
      hover && 'hover:shadow-md',
      className
    )}>
      {children}
    </div>
  );
}

interface ModernGridProps {
  children: React.ReactNode;
  cols?: 'auto' | 'cards' | 'responsive';
  gap?: 'small' | 'normal' | 'large';
  className?: string;
}

export function ModernGrid({ 
  children, 
  cols = 'responsive',
  gap = 'normal',
  className 
}: ModernGridProps) {
  const colClasses = {
    auto: 'grid-cols-1',
    cards: 'grid-cols-cards',
    responsive: 'grid-cols-responsive'
  };

  const gapClasses = {
    small: 'gap-3',
    normal: 'gap-4 sm:gap-6',
    large: 'gap-6 sm:gap-8'
  };

  return (
    <div className={cn(
      'grid',
      colClasses[cols],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function ModernButton({ 
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ModernButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'border border-border hover:bg-accent rounded-lg px-4 py-2.5',
    ghost: 'hover:bg-accent rounded-lg px-4 py-2.5'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

interface ModernBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function ModernBadge({ 
  children, 
  variant = 'default',
  size = 'md',
  className 
}: ModernBadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    default: 'bg-secondary text-secondary-foreground border border-border',
    success: 'badge-success',
    warning: 'badge-warning', 
    error: 'badge-error',
    info: 'bg-blue-50 text-blue-700 border border-blue-200'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <span className={cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </span>
  );
}

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function ModernInput({ 
  label,
  error,
  icon,
  className,
  ...props 
}: ModernInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={cn(
            'input-modern w-full',
            icon && 'pl-10',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
            className
          )}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
