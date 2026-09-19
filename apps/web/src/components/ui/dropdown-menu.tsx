'use client';

import { Content, Item, Portal, Root, Trigger } from '@radix-ui/react-dropdown-menu';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Non-modal on purpose. A modal menu locks page scrolling and then pads the page by the scrollbar's
 * width so nothing jumps; with `scrollbar-gutter: stable` on the page that space is already reserved,
 * so the padding doubled up and the whole page slid sideways whenever a menu opened.
 */
function DropdownMenu(props: React.ComponentPropsWithoutRef<typeof Root>) {
  return <Root modal={false} {...props} />;
}

const DropdownMenuTrigger = Trigger;

const DropdownMenuContent = forwardRef<React.ComponentRef<typeof Content>, React.ComponentPropsWithoutRef<typeof Content>>(
  ({ className, sideOffset = 8, ...props }, ref) => (
    <Portal>
      <Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-36 rounded-lg border-3 border-border bg-background-alternative p-1 text-foreground shadow-toy-sm animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]',
          className,
        )}
        {...props}
      />
    </Portal>
  ),
);
DropdownMenuContent.displayName = Content.displayName;

const DropdownMenuItem = forwardRef<React.ComponentRef<typeof Item>, React.ComponentPropsWithoutRef<typeof Item>>(({ className, ...props }, ref) => (
  <Item
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold outline-none transition-colors focus:bg-primary focus:text-primary-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = Item.displayName;

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger };
