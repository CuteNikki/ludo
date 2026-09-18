'use client';

import { Root, Thumb } from '@radix-ui/react-switch';
import { ComponentRef, forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Switch = forwardRef<ComponentRef<typeof Root>, React.ComponentPropsWithoutRef<typeof Root>>(({ className, ...props }, ref) => (
  <Root
    className={cn(
      'peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-2xl border-2 border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-300',
      className,
    )}
    {...props}
    ref={ref}
  >
    <Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full border-2 border-border bg-background-alternative transition-transform data-[state=checked]:translate-x-5.5 data-[state=unchecked]:translate-x-0.5',
      )}
    />
  </Root>
));
Switch.displayName = Root.displayName;

export { Switch };
