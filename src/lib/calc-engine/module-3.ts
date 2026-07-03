import type {
  CalculationIssue,
  CostLineItem,
  Module3Result,
  RendementBenchmarks,
  RendementInput,
  SourceReference,
} from "@/lib/calc-engine/types";

const BELGISCHE_RENDEMENT_BENCHMARKS: RendementBenchmarks = {
  bruto: { min: 0.03, max: 0.05 },
  netto: { min: 0.01, max: 0.02 },
};

const VERIFIED_SOURCES: SourceReference[] = [
  {
    label: "Statbel - residentiele vastgoedprijsindex",
    url: "https://statbel.fgov.be/nl/themas/bouwen-wonen/residentiele-vastgoedprijsindex",
    verifiedAt: "2026-06-21",
  },
  {
    label: "NBB Verslag 2024 - woning- en hypothecaire markten",
    url: "https://www.nbb.be/doc/ts/publications/nbbreport/2024/nl/t1/verslag2024_tii.pdf",
    verifiedAt: "2026-06-21",
  },
];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function addIssue(
  list: CalculationIssue[],
  level: CalculationIssue["level"],
  code: string,
  message: string,
) {
  list.push({ level, code, message });
}

function bepaalOnderhoudsPercentage(
  input: RendementInput,
  assumptions: string[],
): number | undefined {
  if (input.onderhoudsPercentage !== undefined) {
    return input.onderhoudsPercentage;
  }

  if (input.bouwjaar !== undefined) {
    const currentYear = new Date().getUTCFullYear();

    if (currentYear - input.bouwjaar >= 40) {
      assumptions.push(
        "Omdat geen onderhoudspercentage is ingevuld en het pand minstens 40 jaar oud lijkt, werd 1,5% per jaar als onderhoudsvuistregel gebruikt.",
      );

      return 0.015;
    }
  }

  assumptions.push(
    "Omdat geen onderhoudspercentage is ingevuld, werd de standaardvuistregel van 1% per jaar gebruikt.",
  );

  return 0.01;
}

function bepaalLeegstandMaanden(
  input: RendementInput,
  assumptions: string[],
): number | undefined {
  if (input.leegstandMaanden !== undefined) {
    return input.leegstandMaanden;
  }

  assumptions.push(
    "Omdat geen leegstand is ingevuld, werd 1 maand leegstand per jaar als standaardvuistregel gebruikt.",
  );

  return 1;
}

export function berekenTotaleInvestering(
  aankoopprijs: number,
  aankoopkosten: number,
): number {
  return roundMoney(aankoopprijs + aankoopkosten);
}

export function berekenBAR(
  jaarlijkseBrutoHuur: number,
  totaleInvestering: number,
): number {
  return roundPercent((jaarlijkseBrutoHuur / totaleInvestering) * 100);
}

export function berekenNAR(
  jaarlijkseBrutoHuur: number,
  kosten: {
    onderhoud: number;
    leegstand: number;
    ov: number;
    verzekering: number;
    syndicus: number;
    beheer: number;
  },
  totaleInvestering: number,
): number {
  const totaleKosten =
    kosten.onderhoud +
    kosten.leegstand +
    kosten.ov +
    kosten.verzekering +
    kosten.syndicus +
    kosten.beheer;
  const nettoHuur = jaarlijkseBrutoHuur - totaleKosten;

  return roundPercent((nettoHuur / totaleInvestering) * 100);
}

export function berekenCashOnCash(
  jaarlijkseNettoHuur: number,
  jaarlijkseFinancieringslasten: number,
  eigenInbreng: number,
): number {
  const jaarlijkseKasstroom =
    jaarlijkseNettoHuur - jaarlijkseFinancieringslasten;

  return roundPercent((jaarlijkseKasstroom / eigenInbreng) * 100);
}

export function berekenRendement(
  input: RendementInput,
): Module3Result {
  const assumptions: string[] = [
    "De Belgische benchmark van 3-5% bruto en 1-2% netto is een productvuistregel ter referentie, geen officiele of wettelijke drempel.",
  ];
  const issues: CalculationIssue[] = [];
  const breakdown: CostLineItem[] = [];

  if (input.aankoopprijs === undefined || input.aankoopprijs <= 0) {
    addIssue(
      issues,
      "missing",
      "rendement_aankoopprijs_verplicht",
      "Geef een aankoopprijs op om het rendement te kunnen berekenen.",
    );
  }

  if (input.aankoopkosten === undefined || input.aankoopkosten < 0) {
    addIssue(
      issues,
      "missing",
      "rendement_aankoopkosten_verplicht",
      "Geef de aankoopkosten op om de totale investering correct te berekenen.",
    );
  }

  if (input.maandelijkseHuur === undefined || input.maandelijkseHuur <= 0) {
    addIssue(
      issues,
      "missing",
      "rendement_huur_verplicht",
      "Geef een maandelijkse huur op om BAR en NAR te kunnen berekenen.",
    );
  }

  if (issues.some((issue) => issue.level === "missing")) {
    return {
      status: "partial",
      benchmarks: BELGISCHE_RENDEMENT_BENCHMARKS,
      assumptions,
      issues,
      breakdown,
      sources: VERIFIED_SOURCES,
    };
  }

  const totaleInvestering = berekenTotaleInvestering(
    input.aankoopprijs ?? 0,
    input.aankoopkosten ?? 0,
  );
  const jaarlijkseBrutoHuur = roundMoney((input.maandelijkseHuur ?? 0) * 12);
  const onderhoudsPercentage = bepaalOnderhoudsPercentage(input, assumptions) ?? 0;
  const onderhoudsKosten = roundMoney(
    (input.aankoopprijs ?? 0) * onderhoudsPercentage,
  );
  const leegstandMaanden = bepaalLeegstandMaanden(input, assumptions) ?? 0;
  const leegstandKosten = roundMoney(
    ((input.maandelijkseHuur ?? 0) * leegstandMaanden),
  );
  const jaarlijkseOV = roundMoney(input.jaarlijkseOV ?? 0);
  const verzekering = roundMoney(input.verzekeringJaarlijks ?? 0);
  const syndicus = roundMoney(input.syndicusVmeJaarlijks ?? 0);
  const beheer = roundMoney(input.beheerkostenJaarlijks ?? 0);
  const jaarlijkseKostenTotaal = roundMoney(
    onderhoudsKosten +
      leegstandKosten +
      jaarlijkseOV +
      verzekering +
      syndicus +
      beheer,
  );
  const jaarlijkseNettoHuur = roundMoney(
    jaarlijkseBrutoHuur - jaarlijkseKostenTotaal,
  );
  const bar = berekenBAR(jaarlijkseBrutoHuur, totaleInvestering);
  const nar = berekenNAR(
    jaarlijkseBrutoHuur,
    {
      onderhoud: onderhoudsKosten,
      leegstand: leegstandKosten,
      ov: jaarlijkseOV,
      verzekering,
      syndicus,
      beheer,
    },
    totaleInvestering,
  );

  breakdown.push(
    { label: "Jaarlijkse bruto huur", amount: jaarlijkseBrutoHuur, kind: "exact" },
    { label: "Onderhoud", amount: onderhoudsKosten, kind: "estimate" },
    { label: "Leegstand", amount: leegstandKosten, kind: "estimate" },
    { label: "Onroerende voorheffing", amount: jaarlijkseOV, kind: "exact" },
    { label: "Verzekering", amount: verzekering, kind: "exact" },
    { label: "Syndicus / VME", amount: syndicus, kind: "exact" },
    { label: "Beheerkosten", amount: beheer, kind: "exact" },
  );

  let cashOnCash: number | undefined;

  if (
    input.eigenInbreng !== undefined &&
    input.eigenInbreng > 0 &&
    input.jaarlijkseFinancieringslasten !== undefined &&
    input.jaarlijkseFinancieringslasten >= 0
  ) {
    cashOnCash = berekenCashOnCash(
      jaarlijkseNettoHuur,
      input.jaarlijkseFinancieringslasten,
      input.eigenInbreng,
    );
  } else if (
    input.eigenInbreng !== undefined ||
    input.jaarlijkseFinancieringslasten !== undefined
  ) {
    addIssue(
      issues,
      "info",
      "rendement_cash_on_cash_onvolledig",
      "Cash-on-cash werd niet berekend omdat zowel eigen inbreng als jaarlijkse financieringslasten nodig zijn.",
    );
  }

  return {
    status: "complete",
    totaleInvestering,
    jaarlijkseBrutoHuur,
    onderhoudsPercentageGebruikt: onderhoudsPercentage,
    onderhoudsKosten,
    leegstandMaandenGebruikt: leegstandMaanden,
    leegstandKosten,
    jaarlijkseKostenTotaal,
    jaarlijkseNettoHuur,
    bar,
    nar,
    cashOnCash,
    benchmarks: BELGISCHE_RENDEMENT_BENCHMARKS,
    assumptions,
    issues,
    breakdown,
    sources: VERIFIED_SOURCES,
  };
}
