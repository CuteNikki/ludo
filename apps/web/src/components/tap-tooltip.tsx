'use client';

import { useRef, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * A tooltip whose trigger is a button that also works on touch screens.
 * Radix's Tooltip intentionally never opens from a touch pointer, and always closes on click -
 * reasonable for a hover hint, but these bubbles are the only way touch users can read the
 * content at all, so they need their own tap-to-open/tap-to-close handling underneath.
 */
export function TapTooltip({
  content,
  label,
  className,
  contentClassName,
  children,
}: {
  content: React.ReactNode;
  label: string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const lastPointerTypeRef = useRef<string>('mouse');

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type='button'
          aria-label={label}
          onPointerDown={(event) => {
            lastPointerTypeRef.current = event.pointerType;
            if (event.pointerType === 'touch') event.preventDefault();
          }}
          onClick={(event) => {
            if (lastPointerTypeRef.current !== 'touch') return;
            event.preventDefault();
            setOpen((prev) => !prev);
          }}
          className={className}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className={contentClassName}>{content}</TooltipContent>
    </Tooltip>
  );
}
