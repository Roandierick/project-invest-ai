import { parseOptionalNumber } from "@/lib/analysis/form";
import type { AnalysisFormState, BaselineAnalysisResult } from "@/lib/analysis/types";
import { formatCurrency } from "@/lib/calc-engine";
import type { EnrichmentContext } from "@/lib/enrichment/types";

interface AnalysisResultsCardProps {
  result: BaselineAnalysisResult;
  form: AnalysisFormState;
  enrichmentContext?: EnrichmentContext | null;
}

const percentPointFormatter = new Intl.NumberFormat("nl-BE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatPercentPoints(value?: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return "n.v.t.";
  }

  return `${percentPointFormatter.format(value)}%`;
}

function formatSignedPercentPoints(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${percentPointFormatter.format(value)}%`;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function deriveStatbelBadge(
  form: AnalysisFormState,
  enrichmentContext?: EnrichmentContext | null,
) {
  const statbel = enrichmentContext?.statbel;

  if (!statbel) {
    return null;
  }

  const pandtype = normalizeText(form.pandtype);
  const aankoopprijs = parseOptionalNumber(form.aankoopprijs);
  const gemeente = form.gemeente.trim() || enrichmentContext?.vlabel?.gemeenteNaam;

  const isAppartement = pandtype.includes("appart");
  const isWoonhuis =
    pandtype.includes("huis") ||
    pandtype.includes("woning") ||
    pandtype.includes("rijwoning") ||
    pandtype.includes("halfopen") ||
    pandtype.includes("open bebouwing");

  const referentie = isAppartement
    ? statbel.mediaanVerkoopprijsAppartement
    : isWoonhuis
      ? statbel.mediaanVerkoopprijsWoonhuis
      : undefined;

  const segment = isAppartement
    ? "appartementen"
    : isWoonhuis
      ? "woonhuizen"
      : "pandtype";

  if (referentie === undefined) {
    return {
      label: "Statbel",
      value: `Geen bruikbare mediaan voor ${segment}`,
      detail: `Laatste volledige gemeentelijke referentie: ${statbel.jaar}`,
    };
  }

  if (aankoopprijs === undefined) {
    return {
      label: "Statbel",
      value: `${gemeente ?? "Gemeente"} mediaan ${formatCurrency(referentie)}`,
      detail: `Gemeentelijke mediaan ${segment}, jaar ${statbel.jaar}`,
    };
  }

  const verschil = ((aankoopprijs - referentie) / referentie) * 100;
  const richting = verschil >= 0 ? "boven" : "onder";

  return {
    label: "Statbel",
    value: `${formatSignedPercentPoints(verschil)} ${richting} mediaan`,
    detail: `${gemeente ?? "Gemeente"} ${segment}: ${formatCurrency(referentie)} in ${statbel.jaar}`,
  };
}

function deriveGeopuntBadge(enrichmentContext?: EnrichmentContext | null) {
  const geopunt = enrichmentContext?.geopunt;

  if (!geopunt) {
    return null;
  }

  if (geopunt.overstromingsgevoelig) {
    return {
      label: "Geopunt",
      value: "Publieke zonehit gevonden",
      detail: `${geopunt.zone ?? "Overstromingscontext beschikbaar"}${geopunt.benadering === "gemeentecentrum" ? " - benadering via gemeentecentrum" : ""}`,
    };
  }

  return {
    label: "Geopunt",
    value: "Geen publieke zonehit",
    detail:
      geopunt.benadering === "gemeentecentrum"
        ? "Benadering via gemeentecentrum, dus geen harde perceelconclusie."
        : "Geen publieke zonehit op dit adres, zonder volledige watertoetsconclusie.",
  };
}

function DataRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-foreground)]">
          {label}
        </p>
        {detail ? (
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
            {detail}
          </p>
        ) : null}
      </div>
      <p className="font-semibold text-[var(--color-foreground)] [font-variant-numeric:tabular-nums]">
        {value}
      </p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[0_16px_30px_rgba(0,0,0,0.22)]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-[var(--color-foreground)] [font-variant-numeric:tabular-nums]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
        {detail}
      </p>
    </article>
  );
}

function BadgeCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
        {detail}
      </p>
    </div>
  );
}

function ModuleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
      <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
        {title}
      </h4>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function AnalysisResultsCard({
  result,
  form,
  enrichmentContext,
}: AnalysisResultsCardProps) {
  const statbelBadge = deriveStatbelBadge(form, enrichmentContext);
  const geopuntBadge = deriveGeopuntBadge(enrichmentContext);

  return (
    <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_22px_42px_rgba(0,0,0,0.26)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Snapshotanalyse
          </p>
          <h3 className="mt-2 font-[family:var(--font-display)] text-2xl text-[var(--color-foreground)]">
            Kerncijfers van het dossier
          </h3>
        </div>
        <div
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            result.status === "complete"
              ? "bg-[rgba(45,106,79,0.2)] text-[var(--color-success)]"
              : "bg-[rgba(180,83,9,0.18)] text-[var(--color-warning)]"
          }`}
        >
          {result.status === "complete" ? "Analyse volledig" : "Analyse gedeeltelijk"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <MetricTile
          label="Totale aankoopkost"
          value={formatCurrency(
            result.module1.totalProjectBudgetWithEstimate ??
              result.module1.totalProjectBudgetKnown,
          )}
          detail="Koopsom plus berekende aankoopkosten"
        />
        <MetricTile
          label="Maandlast"
          value={formatCurrency(result.module4.maandlast)}
          detail="Lening op basis van jouw huidige input"
        />
        <MetricTile
          label="NAR"
          value={formatPercentPoints(result.module3.nar)}
          detail="Netto aanvangsrendement op dit moment"
        />
      </div>

      {statbelBadge || geopuntBadge ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {statbelBadge ? <BadgeCard {...statbelBadge} /> : null}
          {geopuntBadge ? <BadgeCard {...geopuntBadge} /> : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ModuleSection title="Aankoopkost">
          <DataRow
            label="Registratiebelasting"
            value={formatCurrency(result.module1.registrationTax.totalDue)}
            detail={
              result.module1.registrationTax.applicableRate !== undefined
                ? `Tarief ${formatPercentPoints(
                    result.module1.registrationTax.applicableRate * 100,
                  )}`
                : "Tarief nog niet volledig bepaald"
            }
          />
          <DataRow
            label="Notariskosten aankoopakte"
            value={formatCurrency(result.module1.notaryPurchaseAct.totalWithEstimate)}
            detail="Inclusief vaste kosten en btw"
          />
          <DataRow
            label="Totaal extra kosten"
            value={formatCurrency(
              result.module1.totalExtraCostsWithEstimate ??
                result.module1.totalExtraCostsKnown,
            )}
            detail="Boven op de aankoopprijs"
          />
        </ModuleSection>

        <ModuleSection title="Rendement">
          <DataRow
            label="BAR"
            value={formatPercentPoints(result.module3.bar)}
            detail="Bruto aanvangsrendement"
          />
          <DataRow
            label="NAR"
            value={formatPercentPoints(result.module3.nar)}
            detail="Netto aanvangsrendement"
          />
          <DataRow
            label="Cash-on-cash"
            value={formatPercentPoints(result.module3.cashOnCash)}
            detail="Kasstroom tegenover eigen inbreng"
          />
        </ModuleSection>

        <ModuleSection title="Lening">
          <DataRow
            label="Maandlast"
            value={formatCurrency(result.module4.maandlast)}
            detail="Annuiteitenformule"
          />
          <DataRow
            label="Totale interest"
            value={formatCurrency(result.module4.totaleInterest)}
            detail="Over de volledige looptijd"
          />
          <DataRow
            label="Eigen inbreng"
            value={formatCurrency(parseOptionalNumber(form.eigenInbreng))}
            detail="Alleen zichtbaar als jij dit invult"
          />
        </ModuleSection>

        {result.module2.totalDue !== undefined ? (
          <ModuleSection title="Onroerende voorheffing">
            <DataRow
              label="OV per jaar"
              value={formatCurrency(result.module2.totalDue)}
              detail={
                result.module2.gemeente && result.module2.aanslagjaar
                  ? `${result.module2.gemeente} aanslagjaar ${result.module2.aanslagjaar}`
                  : "Jaarlijkse Vlaamse OV"
              }
            />
            <DataRow
              label="Geindexeerd KI"
              value={result.module2.geindexeerdKI?.toString() ?? "n.v.t."}
              detail="Afgeleid uit het niet-geindexeerde KI"
            />
            <DataRow
              label="Gemeentelijke opcentiemen"
              value={
                result.module2.gemeentelijkeOpcentiemen !== undefined
                  ? formatPercentPoints(result.module2.gemeentelijkeOpcentiemen)
                  : "n.v.t."
              }
              detail="Gekoppeld aan de officiele VLABEL-dataset"
            />
          </ModuleSection>
        ) : null}

        {result.module5 ? (
          <ModuleSection title="Hefboomeffect">
            <DataRow
              label="REV"
              value={
                result.module5.rev !== undefined
                  ? formatPercentPoints(result.module5.rev * 100)
                  : "n.v.t."
              }
              detail={
                result.module5.hefboomIsPositief
                  ? "De hefboom versterkt het rendement op eigen vermogen."
                  : "Negatieve hefboom: de rente drukt het eigen rendement."
              }
            />
            <DataRow
              label="Verschil met NAR"
              value={
                result.module5.verschilMetRtv !== undefined
                  ? formatSignedPercentPoints(result.module5.verschilMetRtv * 100)
                  : "n.v.t."
              }
            />
          </ModuleSection>
        ) : null}

        {result.module6 ? (
          <ModuleSection title="Erfbelasting">
            <DataRow
              label="Totale erfbelasting"
              value={formatCurrency(result.module6.totaleErfbelasting)}
              detail="Alleen volgens het actuele scenario"
            />
            <DataRow
              label="Onroerend aandeel"
              value={formatCurrency(result.module6.belastbareOnroerendeAandeel)}
            />
            <DataRow
              label="Roerend aandeel"
              value={formatCurrency(result.module6.belastbareRoerendeAandeel)}
            />
          </ModuleSection>
        ) : null}
      </div>
    </section>
  );
}
