'use client';

import { Root } from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentRef, forwardRef } from 'react';

import { cn } from '@/lib/utils';

const labelVariants = cva('block text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60');

const Label = forwardRef<ComponentRef<typeof Root>, React.ComponentPropsWithoutRef<typeof Root> & VariantProps<typeof labelVariants>>(
  ({ className, ...props }, ref) => <Root ref={ref} className={cn(labelVariants(), className)} {...props} />,
);
Label.displayName = Root.displayName;

export { Label };
