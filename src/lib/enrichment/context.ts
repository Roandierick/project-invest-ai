import type { AnalysisFormState } from "@/lib/analysis/types";
import { fetchGeopuntOverstromingsContext } from "@/lib/enrichment/geopunt";
import { normalizeLookupText } from "@/lib/enrichment/normalize";
import {
  lookupStatbelVastgoedReferentie,
  STATBEL_VASTGOED_PEILDATUM,
  STATBEL_VASTGOED_SOURCE_URL,
} from "@/lib/enrichment/statbel";
import type { EnrichmentContext } from "@/lib/enrichment/types";
import {
  lookupVlaamseOpcentiemen,
  VLABEL_OPCENTIEMEN_PEILDATUM,
  VLABEL_OPCENTIEMEN_SOURCE_URL,
} from "@/lib/enrichment/vlabel";

function buildLocationCacheKey(form: AnalysisFormState): string {
  return [
    form.gemeenteNisCode.trim(),
    normalizeLookupText(form.gemeente),
    form.postcode.trim(),
  ].join("|");
}

export async function buildEnrichmentContext(
  form: AnalysisFormState,
): Promise<EnrichmentContext | null> {
  const vlabel = lookupVlaamseOpcentiemen({
    nisCode: form.gemeenteNisCode,
    gemeenteNaam: form.gemeente,
  });
  const statbel = lookupStatbelVastgoedReferentie({
    nisCode: form.gemeenteNisCode,
    gemeenteNaam: form.gemeente,
  });
  const geopunt = await fetchGeopuntOverstromingsContext(form);

  const next: EnrichmentContext = {};

  if (vlabel?.kind === "exact") {
    next.vlabel = {
      gemeenteNaam: vlabel.record.gemeenteNaam,
      nisCode: vlabel.record.nisCode,
      provincialeOpcentiemen: vlabel.record.provincialeOpcentiemen,
      gemeentelijkeOpcentiemen: vlabel.record.gemeentelijkeOpcentiemen,
      peildatum: VLABEL_OPCENTIEMEN_PEILDATUM,
      bronUrl: VLABEL_OPCENTIEMEN_SOURCE_URL,
    };
  }

  if (statbel) {
    const heeftPrijsreferentie =
      statbel.mediaanVerkoopprijsAppartement !== undefined ||
      statbel.mediaanVerkoopprijsWoonhuis !== undefined;

    if (heeftPrijsreferentie) {
      next.statbel = {
        mediaanVerkoopprijsAppartement:
          statbel.mediaanVerkoopprijsAppartement,
        mediaanVerkoopprijsWoonhuis: statbel.mediaanVerkoopprijsWoonhuis,
        jaar: statbel.jaar,
        peildatum: STATBEL_VASTGOED_PEILDATUM,
        bronUrl: STATBEL_VASTGOED_SOURCE_URL,
        maatstaf: "mediaan",
      };
    }
  }

  if (geopunt) {
    next.geopunt = geopunt;
  }

  return Object.keys(next).length > 0 ? next : null;
}

export async function resolveEnrichmentContext(args: {
  form: AnalysisFormState;
  storedForm?: AnalysisFormState | null;
  storedEnrichmentContext?: EnrichmentContext | null;
}): Promise<EnrichmentContext | null> {
  const currentKey = buildLocationCacheKey(args.form);
  const storedKey = args.storedForm ? buildLocationCacheKey(args.storedForm) : null;

  if (
    storedKey !== null &&
    currentKey === storedKey &&
    args.storedEnrichmentContext !== undefined &&
    args.storedEnrichmentContext !== null
  ) {
    return args.storedEnrichmentContext;
  }

  return buildEnrichmentContext(args.form);
}
