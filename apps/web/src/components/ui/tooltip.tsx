'use client';

import { Content, Portal, Provider, Root, Trigger } from '@radix-ui/react-tooltip';
import { ComponentRef, forwardRef } from 'react';

import { cn } from '@/lib/utils';

const TooltipProvider = Provider;

const Tooltip = Root;

const TooltipTrigger = Trigger;

const TooltipContent = forwardRef<ComponentRef<typeof Content>, React.ComponentPropsWithoutRef<typeof Content>>(
  ({ className, sideOffset = 8, ...props }, ref) => (
    <Portal>
      <Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-64 m-2 border-2 border-border bg-background-alternative px-3 py-2 text-left text-xs font-medium leading-5 text-foreground shadow-card animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]',
          className,
        )}
        {...props}
      />
    </Portal>
  ),
);
TooltipContent.displayName = Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
