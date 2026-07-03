import type { CalculationIssue } from "@/lib/calc-engine";

interface IssueListProps {
  issues: CalculationIssue[];
  emptyMessage?: string;
}

const ISSUE_STYLES: Record<
  CalculationIssue["level"],
  {
    label: string;
    className: string;
    iconClassName: string;
  }
> = {
  missing: {
    label: "Vul dit aan",
    className:
      "border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)]",
    iconClassName: "bg-[#D7D2CB] text-[#4E4B47]",
  },
  info: {
    label: "Info",
    className:
      "border-[#D5E4F5] bg-[#EEF4FB] text-[var(--color-primary)]",
    iconClassName: "bg-[var(--color-primary)] text-white",
  },
  warning: {
    label: "Waarschuwing",
    className:
      "border-[#F1D3B5] bg-[#FFF4E8] text-[var(--color-warning)]",
    iconClassName: "bg-[var(--color-warning)] text-white",
  },
};

function IssueIcon({ level }: { level: CalculationIssue["level"] }) {
  if (level === "warning") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 8.5v4.5" />
        <path d="M12 17h.01" />
        <path d="M10.28 3.86L1.82 18a2 2 0 001.72 3h16.92a2 2 0 001.72-3L13.72 3.86a2 2 0 00-3.44 0z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

export function IssueList({
  issues,
  emptyMessage = "Geen openstaande issues in deze snapshot.",
}: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-[#D3E6DB] bg-[#F1F8F4] px-4 py-4 text-sm text-[var(--color-success)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => {
        const tone = ISSUE_STYLES[issue.level];

        return (
          <article
            key={`${issue.code}-${issue.message}`}
            className={`rounded-[1.25rem] border px-4 py-4 ${tone.className}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.iconClassName}`}
              >
                <IssueIcon level={issue.level} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                  {tone.label}
                </p>
                <p className="mt-2 text-sm leading-6">{issue.message}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
