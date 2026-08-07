import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border bg-card px-3 py-1 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-20 w-full rounded-lg border bg-card px-3 py-2 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border bg-card px-3 py-1 text-sm shadow-sm transition-all focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium leading-none text-foreground', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export { Input, Textarea, Select, Label };
