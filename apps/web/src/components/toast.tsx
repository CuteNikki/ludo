'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

const EXIT_DURATION_MS = 200;

/**
 * A transient notice: animates in on mount, dismisses itself after `duration`, and animates out
 * before calling `onDismiss` (which should unmount it). Give it a fresh `key` per notice so a new
 * one restarts the timer. Children may be a function receiving `dismiss` for a close button.
 */
export function Toast({
  onDismiss,
  duration = 6_000,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  onDismiss: () => void;
  duration?: number;
  children: React.ReactNode | ((dismiss: () => void) => React.ReactNode);
}) {
  const [leaving, setLeaving] = useState(false);
  const dismiss = useCallback(() => setLeaving(true), []);
  // Callers pass inline arrows and re-render often; a ref keeps that from resetting the timers.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (leaving) return;
    const timer = window.setTimeout(dismiss, duration);
    return () => window.clearTimeout(timer);
  }, [leaving, duration, dismiss]);

  // A timeout rather than `onAnimationEnd`, so a browser that skips the animation can't strand it.
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => onDismissRef.current(), EXIT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return (
    <div {...props} className={cn(leaving ? 'animate-toast-exit' : 'animate-toast-enter', className)}>
      {typeof children === 'function' ? children(dismiss) : children}
    </div>
  );
}
