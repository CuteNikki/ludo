'use client';

import { Root, Thumb } from '@radix-ui/react-switch';
import { ComponentRef, forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Switch = forwardRef<ComponentRef<typeof Root>, React.ComponentPropsWithoutRef<typeof Root>>(({ className, ...props }, ref) => (
  <Root
    className={cn(
      'peer relative inline-flex h-8 w-14 shrink-0 cursor-pointer touch-manipulation items-center rounded-full border-3 border-border transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:bg-p-green data-[state=unchecked]:bg-foreground/20',
      className,
    )}
    {...props}
    ref={ref}
  >
    <Thumb className='pointer-events-none block size-5 rounded-full border-2 border-border bg-white shadow-[0_2px_0_var(--shadow-color)] transition-transform data-[state=checked]:translate-x-[1.7rem] data-[state=unchecked]:translate-x-[0.2rem]' />
  </Root>
));
Switch.displayName = Root.displayName;

export { Switch };
