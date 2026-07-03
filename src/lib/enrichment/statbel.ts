import { STATBEL_VASTGOED_REFERENTIES_2025 } from "@/lib/enrichment/data/statbel-vastgoed-referenties";
import { normalizeLookupText } from "@/lib/enrichment/normalize";

export const STATBEL_VASTGOED_SOURCE_URL =
  "https://statbel.fgov.be/sites/default/files/files/opendata/immo/vastgoed_2010_9999.xlsx";
export const STATBEL_VASTGOED_PEILDATUM = "2025";

export interface StatbelVastgoedReferentie {
  nisCode: string;
  gemeenteNaam: string;
  jaar: number;
  mediaanVerkoopprijsAppartement?: number;
  mediaanVerkoopprijsWoonhuis?: number;
}

type RawStatbelRecord = {
  nisCode: string;
  gemeenteNaam: string;
  jaar: number;
  mediaanVerkoopprijsAppartement: number | null;
  mediaanVerkoopprijsWoonhuis: number | null;
};

const STATBEL_RECORDS =
  STATBEL_VASTGOED_REFERENTIES_2025 as readonly RawStatbelRecord[];

const BY_NIS = new Map<string, StatbelVastgoedReferentie>(
  STATBEL_RECORDS.map((record): [string, StatbelVastgoedReferentie] => [
    record.nisCode,
    {
      nisCode: record.nisCode,
      gemeenteNaam: record.gemeenteNaam,
      jaar: record.jaar,
      mediaanVerkoopprijsAppartement:
        record.mediaanVerkoopprijsAppartement ?? undefined,
      mediaanVerkoopprijsWoonhuis:
        record.mediaanVerkoopprijsWoonhuis ?? undefined,
    } satisfies StatbelVastgoedReferentie,
  ]),
);

const BY_GEMEENTE = new Map<string, StatbelVastgoedReferentie>(
  STATBEL_RECORDS.map((record): [string, StatbelVastgoedReferentie] => [
    normalizeLookupText(record.gemeenteNaam),
    {
      nisCode: record.nisCode,
      gemeenteNaam: record.gemeenteNaam,
      jaar: record.jaar,
      mediaanVerkoopprijsAppartement:
        record.mediaanVerkoopprijsAppartement ?? undefined,
      mediaanVerkoopprijsWoonhuis:
        record.mediaanVerkoopprijsWoonhuis ?? undefined,
    } satisfies StatbelVastgoedReferentie,
  ]),
);

export function lookupStatbelVastgoedReferentie(args: {
  nisCode?: string;
  gemeenteNaam?: string;
}): StatbelVastgoedReferentie | null {
  const nisCode = args.nisCode?.trim();

  if (nisCode && BY_NIS.has(nisCode)) {
    return BY_NIS.get(nisCode) ?? null;
  }

  const gemeenteNaam = args.gemeenteNaam?.trim();

  if (!gemeenteNaam) {
    return null;
  }

  return BY_GEMEENTE.get(normalizeLookupText(gemeenteNaam)) ?? null;
}
