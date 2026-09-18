'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Marks its children `data-in-view` once they scroll into the viewport, so CSS (see the
 * `scroll-reveal`/`stagger-fade-in` utilities in globals.css) can animate them in. Stays invisible
 * to `prefers-reduced-motion` visitors by revealing immediately instead of observing.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-in-view={visible ? '' : undefined} className={className}>
      {children}
    </div>
  );
}
