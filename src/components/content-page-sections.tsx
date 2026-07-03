import { StartAnalysisButton } from "@/components/start-analysis-button";

interface ContentPageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function ContentPageIntro({
  eyebrow,
  title,
  description,
}: ContentPageIntroProps) {
  return (
    <section className="app-shell-card rounded-[1.75rem] p-6 md:p-8">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {eyebrow}
      </p>
      <h1 className="mt-4 max-w-4xl font-[family:var(--font-display)] text-4xl leading-tight text-[var(--color-foreground)] md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)] md:text-base">
        {description}
      </p>
    </section>
  );
}

export function ContentSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-shell-card rounded-[1.75rem] p-6 md:p-8">
      <div className="max-w-3xl">
        <h2 className="font-[family:var(--font-display)] text-3xl text-[var(--color-foreground)]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] md:text-base">
          {description}
        </p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ContentCard({
  kicker,
  title,
  tagline,
  children,
}: {
  kicker: string;
  title: string;
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_20px_rgba(27,58,92,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(27,58,92,0.08)]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
        {kicker}
      </p>
      <h3 className="mt-3 font-[family:var(--font-display)] text-2xl leading-tight text-[var(--color-foreground)]">
        {title}
      </h3>
      <p className="mt-3 text-sm font-medium leading-6 text-[var(--color-foreground)]">
        {tagline}
      </p>
      <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--color-muted)]">
        {children}
      </div>
    </article>
  );
}

export function DetailBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--color-foreground)]">
        {text}
      </p>
    </div>
  );
}

export function ContentCta({
  currentUserId,
  title,
  description,
}: {
  currentUserId?: string;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-primary)] p-6 text-white shadow-[0_12px_28px_rgba(27,58,92,0.12)] md:p-8">
      <div className="max-w-3xl">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/62">
          Volgende stap
        </p>
        <h2 className="mt-4 font-[family:var(--font-display)] text-3xl leading-tight">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/78 md:text-base">
          {description}
        </p>
      </div>
      <div className="mt-6">
        <StartAnalysisButton
          currentUserId={currentUserId}
          className="rounded-[1rem] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[#F3F6FA] disabled:opacity-60"
        />
      </div>
    </section>
  );
}
