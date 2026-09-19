import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Input = forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // 16px minimum on touch screens keeps iOS from zooming the page when the field is focused.
        'flex h-12 w-full rounded-lg border-3 border-border bg-background-alternative px-4 text-base font-bold shadow-[inset_0_3px_0_rgb(0_0_0/0.07),0_4px_0_var(--shadow-color)] outline-none transition-[box-shadow,border-color] placeholder:font-semibold placeholder:text-foreground/40 focus:ring-4 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
