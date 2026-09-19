import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** A chunky toy button: it sits on a hard shadow and physically presses down when clicked. */
const buttonVariants = cva(
  'inline-flex max-w-full select-none touch-manipulation items-center justify-center gap-2 rounded-lg text-center leading-tight border-3 border-border font-display tracking-wide shadow-toy transition-[translate,box-shadow,background-color,filter] duration-100 hover:-translate-y-px hover:shadow-[0_5px_0_var(--shadow-color)] active:translate-y-1 active:shadow-[0_0_0_var(--shadow-color)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:brightness-105',
        outline: 'bg-background-alternative text-foreground hover:bg-background',
        danger: 'bg-p-red text-white hover:brightness-105',
        ghost: 'border-transparent bg-transparent shadow-none hover:translate-y-0 hover:bg-foreground/10 hover:shadow-none active:translate-y-0',
      },
      size: {
        default: 'min-h-11 px-5 py-1.5 text-base',
        sm: 'min-h-9 px-3 py-1 text-sm',
        lg: 'min-h-14 px-7 py-2 text-xl',
        icon: 'size-11 p-0 text-base',
        'icon-sm': 'size-9 p-0 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ asChild = false, className, variant, size, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
