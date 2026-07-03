import type { OpcentiemenPerGemeente } from "@/lib/calc-engine/types";
import {
  VLAAMSE_OPCENTIEMEN_2026,
  VLAAMSE_OPCENTIEMEN_2026_GEDIFFERENTIEERD,
} from "@/lib/enrichment/data/vlaamse-opcentiemen";
import { normalizeLookupText } from "@/lib/enrichment/normalize";

export const VLABEL_OPCENTIEMEN_SOURCE_URL =
  "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/onroerende-voorheffing/berekening-van-de-onroerende-voorheffing";
export const VLABEL_OPCENTIEMEN_DATASET_URL =
  "https://assets.vlaanderen.be/raw/upload/v1773065110/OV_OverzichtOpcentiemen_fxdocl.xlsx";
export const VLABEL_OPCENTIEMEN_PEILDATUM = "2026";

interface DifferentiatedMunicipalityRecord {
  nisCode: string;
  gemeenteNaam: string;
  provincialeOpcentiemen: number;
  gemeentelijkeOpcentiemenOpties: readonly number[];
  aanslagjaar: number;
}

export type VlabelLookupResult =
  | {
      kind: "exact";
      record: OpcentiemenPerGemeente;
      matchedBy: "nis" | "gemeente";
    }
  | {
      kind: "differentiated";
      record: DifferentiatedMunicipalityRecord;
      matchedBy: "nis" | "gemeente";
    };

type RawExactMunicipalityRecord = {
  nisCode: string;
  gemeenteNaam: string;
  provincialeOpcentiemen: number;
  gemeentelijkeOpcentiemen: number;
  aanslagjaar: number;
};

type LookupResultWithoutMatch =
  | {
      kind: "exact";
      record: OpcentiemenPerGemeente;
    }
  | {
      kind: "differentiated";
      record: DifferentiatedMunicipalityRecord;
    };

const EXACT_RECORDS =
  VLAAMSE_OPCENTIEMEN_2026 as readonly RawExactMunicipalityRecord[];
const DIFFERENTIATED_RECORDS =
  VLAAMSE_OPCENTIEMEN_2026_GEDIFFERENTIEERD as readonly DifferentiatedMunicipalityRecord[];

const EXACT_BY_NIS = new Map<string, OpcentiemenPerGemeente>(
  EXACT_RECORDS.map((record): [string, OpcentiemenPerGemeente] => [
    record.nisCode,
    {
      nisCode: record.nisCode,
      gemeenteNaam: record.gemeenteNaam,
      provincialeOpcentiemen: record.provincialeOpcentiemen,
      gemeentelijkeOpcentiemen: record.gemeentelijkeOpcentiemen,
      aanslagjaar: record.aanslagjaar,
    } satisfies OpcentiemenPerGemeente,
  ]),
);

const EXACT_BY_GEMEENTE = new Map<string, OpcentiemenPerGemeente>(
  EXACT_RECORDS.map((record): [string, OpcentiemenPerGemeente] => [
    normalizeLookupText(record.gemeenteNaam),
    {
      nisCode: record.nisCode,
      gemeenteNaam: record.gemeenteNaam,
      provincialeOpcentiemen: record.provincialeOpcentiemen,
      gemeentelijkeOpcentiemen: record.gemeentelijkeOpcentiemen,
      aanslagjaar: record.aanslagjaar,
    } satisfies OpcentiemenPerGemeente,
  ]),
);

const DIFFERENTIATED_BY_NIS = new Map<string, DifferentiatedMunicipalityRecord>(
  DIFFERENTIATED_RECORDS.map(
    (record): [string, DifferentiatedMunicipalityRecord] => [
    record.nisCode,
    {
      nisCode: record.nisCode,
      gemeenteNaam: record.gemeenteNaam,
      provincialeOpcentiemen: record.provincialeOpcentiemen,
      gemeentelijkeOpcentiemenOpties: [
        ...record.gemeentelijkeOpcentiemenOpties,
      ] as readonly number[],
      aanslagjaar: record.aanslagjaar,
    } satisfies DifferentiatedMunicipalityRecord,
  ]),
);

const DIFFERENTIATED_BY_GEMEENTE = new Map<
  string,
  DifferentiatedMunicipalityRecord
>(
  DIFFERENTIATED_RECORDS.map(
    (record): [string, DifferentiatedMunicipalityRecord] => [
    normalizeLookupText(record.gemeenteNaam),
    {
      nisCode: record.nisCode,
      gemeenteNaam: record.gemeenteNaam,
      provincialeOpcentiemen: record.provincialeOpcentiemen,
      gemeentelijkeOpcentiemenOpties: [
        ...record.gemeentelijkeOpcentiemenOpties,
      ] as readonly number[],
      aanslagjaar: record.aanslagjaar,
    } satisfies DifferentiatedMunicipalityRecord,
  ]),
);

function lookupByNis(
  nisCode?: string,
): LookupResultWithoutMatch | null {
  if (!nisCode?.trim()) {
    return null;
  }

  const normalized = nisCode.trim();
  const exact = EXACT_BY_NIS.get(normalized);

  if (exact) {
    return {
      kind: "exact",
      record: exact,
    };
  }

  const differentiated = DIFFERENTIATED_BY_NIS.get(normalized);

  if (differentiated) {
    return {
      kind: "differentiated",
      record: differentiated,
    };
  }

  return null;
}

function lookupByMunicipalityName(
  gemeenteNaam?: string,
): LookupResultWithoutMatch | null {
  if (!gemeenteNaam?.trim()) {
    return null;
  }

  const normalized = normalizeLookupText(gemeenteNaam);
  const exact = EXACT_BY_GEMEENTE.get(normalized);

  if (exact) {
    return {
      kind: "exact",
      record: exact,
    };
  }

  const differentiated = DIFFERENTIATED_BY_GEMEENTE.get(normalized);

  if (differentiated) {
    return {
      kind: "differentiated",
      record: differentiated,
    };
  }

  return null;
}

export function lookupVlaamseOpcentiemen(args: {
  nisCode?: string;
  gemeenteNaam?: string;
}): VlabelLookupResult | null {
  const byNis = lookupByNis(args.nisCode);

  if (byNis) {
    return {
      ...byNis,
      matchedBy: "nis",
    };
  }

  const byMunicipality = lookupByMunicipalityName(args.gemeenteNaam);

  if (byMunicipality) {
    return {
      ...byMunicipality,
      matchedBy: "gemeente",
    };
  }

  return null;
}
