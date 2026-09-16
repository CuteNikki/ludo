import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

const buttonVariants = cva(
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'bg-stone-950 text-white hover:bg-stone-800',
        outline: 'border border-stone-300 bg-white text-stone-950 hover:bg-stone-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ asChild = false, className, variant, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />;
}
