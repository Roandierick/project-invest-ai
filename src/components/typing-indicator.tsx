export function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2 text-sm text-[var(--color-muted)]">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)] [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)] [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
      </span>
      <span>{label}</span>
    </div>
  );
}
