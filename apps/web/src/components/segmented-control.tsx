import { cn } from '@/lib/utils';

/** A row of mutually exclusive toy buttons. Used where a dropdown would be one tap too many. */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  className,
  ...props
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode; disabled?: boolean }>;
  onChange: (value: T) => void;
  className?: string;
  'aria-label': string;
}) {
  return (
    <div
      role='group'
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      className={cn('grid gap-1 rounded-lg border-3 border-border bg-background p-1', className)}
      {...props}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type='button'
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-9 touch-manipulation items-center justify-center gap-1.5 rounded-md px-2 font-display text-sm tracking-wide transition-colors focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'bg-primary text-primary-foreground shadow-[0_2px_0_var(--shadow-color)] ring-2 ring-border' : 'text-foreground/70 hover:bg-foreground/10',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
