import type {
  ErfenisInput,
  HefboomInput,
  LeningInput,
  Module1Input,
  OVInput,
  RendementInput,
} from "@/lib/calc-engine";
import { formatCurrency } from "@/lib/calc-engine";
import type {
  AnalysisFormState,
  BooleanChoice,
  OpeningContext,
} from "@/lib/analysis/types";

export function emptyForm(): AnalysisFormState {
  return {
    aankoopprijs: "",
    postcode: "",
    gemeente: "",
    gemeenteNisCode: "",
    pandtype: "",
    oppervlakte: "",
    bouwjaar: "",
    nietGeindexeerdKi: "",
    epcLabel: "",
    aantalSlaapkamers: "",
    maandelijkseHuur: "",
    onderhoudsPercentage: "",
    leegstandMaanden: "",
    verzekeringJaarlijks: "",
    syndicusVmeJaarlijks: "",
    beheerkostenJaarlijks: "",
    eigenInbreng: "",
    jaarlijkseFinancieringslasten: "",
    geleendBedrag: "",
    jaarlijkseRente: "",
    looptijdJaren: "",
    leningType: "",
    nettoMaandinkomen: "",
    alleenstaand: "",
    gewest: "",
    aankoopSituatie: "",
    compromisDatum: "",
    authentiekeAkteDatum: "",
    kopersZijnUitsluitendNatuurlijkePersonen: "",
    verwervingInVolleEigendom: "",
    heeftAndereWoningInVolleEigendom: "",
    verkooptAndereWoningBinnenTolerantie: "",
    ligtInKernstadOfVlaamseRand: "",
    geschatteUitgavenAanDerdenExclBtw: "",
    isEigenWoningVanEigenaar: "",
    kinderenTenLaste: "",
    invaliditeit: "",
    eigenaarOuderDan70: "",
    erfbelastingOnroerendAandeel: "",
    erfbelastingRoerendAandeel: "",
    erfbelastingGroepsTotaal: "",
    erfbelastingVerwantschap: "",
    erfbelastingGewest: "",
    erfbelastingIsLangstlevendePartner: "",
    erfbelastingIsGezinswoning: "",
    notes: "",
  };
}

export function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s/g, "");
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  let canonical = normalized;

  if (hasComma && hasDot) {
    canonical = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    canonical = normalized.replace(",", ".");
  } else {
    canonical = normalized.replace(/,/g, "");
  }

  const parsed = Number(canonical);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseOptionalInteger(value: string): number | undefined {
  const parsed = parseOptionalNumber(value);

  if (parsed === undefined) {
    return undefined;
  }

  return Math.trunc(parsed);
}

export function parseOptionalRate(value: string): number | undefined {
  const parsed = parseOptionalNumber(value);

  if (parsed === undefined) {
    return undefined;
  }

  return parsed > 1 ? parsed / 100 : parsed;
}

export function parseOptionalBoolean(value: BooleanChoice): boolean | undefined {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

export function toModule1Input(form: AnalysisFormState): Module1Input {
  return {
    aankoopprijs: parseOptionalNumber(form.aankoopprijs),
    gewest: form.gewest || undefined,
    aankoopSituatie: form.aankoopSituatie || undefined,
    compromisDatum: form.compromisDatum || undefined,
    authentiekeAkteDatum: form.authentiekeAkteDatum || undefined,
    kopersZijnUitsluitendNatuurlijkePersonen: parseOptionalBoolean(
      form.kopersZijnUitsluitendNatuurlijkePersonen,
    ),
    verwervingInVolleEigendom: parseOptionalBoolean(
      form.verwervingInVolleEigendom,
    ),
    heeftAndereWoningInVolleEigendom: parseOptionalBoolean(
      form.heeftAndereWoningInVolleEigendom,
    ),
    verkooptAndereWoningBinnenTolerantie: parseOptionalBoolean(
      form.verkooptAndereWoningBinnenTolerantie,
    ),
    ligtInKernstadOfVlaamseRand: parseOptionalBoolean(
      form.ligtInKernstadOfVlaamseRand,
    ),
    geschatteUitgavenAanDerdenExclBtw: parseOptionalNumber(
      form.geschatteUitgavenAanDerdenExclBtw,
    ),
  };
}

export function toModule2Input(form: AnalysisFormState): OVInput {
  return {
    nietGeindexeerdKI: parseOptionalNumber(form.nietGeindexeerdKi),
    gemeenteNisCode: form.gemeenteNisCode || undefined,
    gemeenteNaam: form.gemeente || undefined,
    isEigenWoningVanEigenaar: parseOptionalBoolean(
      form.isEigenWoningVanEigenaar,
    ),
    kinderenTenLaste: parseOptionalInteger(form.kinderenTenLaste),
    invaliditeit: parseOptionalBoolean(form.invaliditeit),
    eigenaarOuderDan70: parseOptionalBoolean(form.eigenaarOuderDan70),
    authentiekeAkteDatum: form.authentiekeAkteDatum || undefined,
  };
}

export function toModule3Input(
  form: AnalysisFormState,
  options: {
    aankoopkosten?: number;
    jaarlijkseOV?: number;
    jaarlijkseFinancieringslastenFallback?: number;
  },
): RendementInput {
  return {
    aankoopprijs: parseOptionalNumber(form.aankoopprijs),
    aankoopkosten: options.aankoopkosten,
    maandelijkseHuur: parseOptionalNumber(form.maandelijkseHuur),
    onderhoudsPercentage: parseOptionalRate(form.onderhoudsPercentage),
    leegstandMaanden: parseOptionalNumber(form.leegstandMaanden),
    jaarlijkseOV: options.jaarlijkseOV,
    verzekeringJaarlijks: parseOptionalNumber(form.verzekeringJaarlijks),
    syndicusVmeJaarlijks: parseOptionalNumber(form.syndicusVmeJaarlijks),
    beheerkostenJaarlijks: parseOptionalNumber(form.beheerkostenJaarlijks),
    eigenInbreng: parseOptionalNumber(form.eigenInbreng),
    jaarlijkseFinancieringslasten:
      parseOptionalNumber(form.jaarlijkseFinancieringslasten) ??
      options.jaarlijkseFinancieringslastenFallback,
    bouwjaar: parseOptionalInteger(form.bouwjaar),
  };
}

export function toModule4Input(form: AnalysisFormState): LeningInput {
  return {
    geleendBedrag: parseOptionalNumber(form.geleendBedrag),
    jaarlijkseRente: parseOptionalRate(form.jaarlijkseRente),
    looptijdJaren: parseOptionalInteger(form.looptijdJaren),
    type: form.leningType || undefined,
    aankoopprijs: parseOptionalNumber(form.aankoopprijs),
    aankoopSituatie: form.aankoopSituatie || undefined,
    nettoMaandinkomen: parseOptionalNumber(form.nettoMaandinkomen),
    aantalKinderenTenLaste: parseOptionalInteger(form.kinderenTenLaste),
    alleenstaand: parseOptionalBoolean(form.alleenstaand),
  };
}

export function toModule5Input(
  form: AnalysisFormState,
  options: {
    narPercentage?: number;
  },
): HefboomInput {
  return {
    rtv:
      options.narPercentage !== undefined
        ? options.narPercentage / 100
        : undefined,
    rvv: parseOptionalRate(form.jaarlijkseRente),
    vreemdVermogen: parseOptionalNumber(form.geleendBedrag),
    eigenVermogen: parseOptionalNumber(form.eigenInbreng),
  };
}

export function toModule6Input(form: AnalysisFormState): ErfenisInput {
  return {
    onroerendAandeel: parseOptionalNumber(form.erfbelastingOnroerendAandeel),
    roerendAandeel: parseOptionalNumber(form.erfbelastingRoerendAandeel),
    groepsTotaal: parseOptionalNumber(form.erfbelastingGroepsTotaal),
    verwantschap: form.erfbelastingVerwantschap || undefined,
    gewest: form.erfbelastingGewest || undefined,
    isLangstlevendePartner: parseOptionalBoolean(
      form.erfbelastingIsLangstlevendePartner,
    ),
    isGezinswoning: parseOptionalBoolean(form.erfbelastingIsGezinswoning),
  };
}

export function toOpeningContext(form: AnalysisFormState): OpeningContext {
  return {
    aankoopprijs: parseOptionalNumber(form.aankoopprijs),
    pandtype: form.pandtype || undefined,
    gemeente: form.gemeente || undefined,
    maandelijkseHuur: parseOptionalNumber(form.maandelijkseHuur),
  };
}

export function summarizeSubmission(form: AnalysisFormState): string {
  const bits = [
    form.aankoopprijs
      ? `Aankoopprijs ${formatCurrency(parseOptionalNumber(form.aankoopprijs))}`
      : "",
    form.gemeente || form.postcode
      ? [form.gemeente, form.postcode].filter(Boolean).join(" ")
      : "",
    form.pandtype,
    form.gewest,
    form.aankoopSituatie?.replaceAll("_", " "),
    form.maandelijkseHuur
      ? `huur ${formatCurrency(parseOptionalNumber(form.maandelijkseHuur))}/maand`
      : "",
    form.geleendBedrag
      ? `lening ${formatCurrency(parseOptionalNumber(form.geleendBedrag))}`
      : "",
    form.jaarlijkseRente ? `rente ${form.jaarlijkseRente}%` : "",
    form.epcLabel ? `EPC ${form.epcLabel}` : "",
  ].filter(Boolean);

  if (bits.length === 0) {
    return "Ik wil een eerste inschatting, ook al heb ik nog bijna geen gegevens ingevuld.";
  }

  return `Nieuwe of aangepaste input: ${bits.join(" | ")}.`;
}

export function deriveTitle(form: AnalysisFormState): string {
  if (form.gemeente && form.pandtype) {
    return `${form.pandtype} in ${form.gemeente}`;
  }

  if (form.gemeente) {
    return `Analyse ${form.gemeente}`;
  }

  if (form.aankoopprijs) {
    return `Analyse ${formatCurrency(parseOptionalNumber(form.aankoopprijs))}`;
  }

  return "Nieuwe analyse";
}

export function mergeFormPatch(
  current: AnalysisFormState,
  patch: Partial<AnalysisFormState>,
): AnalysisFormState {
  return {
    ...current,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ),
  };
}
