import type {
  AankoopSituatie,
  CalculationIssue,
  DstiCheckResult,
  LeningInput,
  Module4Result,
  QuotiteitCheckResult,
  SourceReference,
} from "@/lib/calc-engine/types";

const VERIFIED_SOURCES: SourceReference[] = [
  {
    label: "NBB - FAQ prudentiele verwachtingen voor hypothecaire leningen",
    url: "https://www.nbb.be/nl/financieel-toezicht/macroprudentieel-beleid/macroprudentiele-instrumenten/vastgoed/faq-prudentiele",
    verifiedAt: "2026-06-21",
  },
  {
    label: "NBB Verslag 2024 - hoge quotiteiten en hypotheeklasten",
    url: "https://www.nbb.be/doc/ts/publications/nbbreport/2024/nl/t1/verslag2024_tii.pdf",
    verifiedAt: "2026-06-21",
  },
];

const DSTI_HEURISTIEK = {
  drempelInkomen: 3500,
  grensOnderDrempel: 0.5,
  grensBovenDrempel: 0.6,
  minimaalResterendAlleenstaand: 1000,
  minimaalResterendKoppel: 1400,
  minimaalResterendPerKind: 100,
} as const;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 10000) / 100;
}

function addIssue(
  list: CalculationIssue[],
  level: CalculationIssue["level"],
  code: string,
  message: string,
) {
  list.push({ level, code, message });
}

function bepaalQuotiteitRichtlijn(
  aankoopSituatie?: AankoopSituatie,
): QuotiteitCheckResult | undefined {
  if (!aankoopSituatie) {
    return undefined;
  }

  if (aankoopSituatie === "investering_of_tweede") {
    return {
      richtlijnMax: 0.8,
      label: "Investering of tweede verblijf",
    };
  }

  return {
    richtlijnMax: 0.9,
    label: "Eigen bewoning",
  };
}

export function berekenMaandlast(
  geleendBedrag: number,
  jaarlijkseRente: number,
  looptijdJaren: number,
): number {
  const maandRente = jaarlijkseRente / 12;
  const aantalMaanden = looptijdJaren * 12;

  if (maandRente === 0) {
    return roundMoney(geleendBedrag / aantalMaanden);
  }

  const maandlast =
    (geleendBedrag *
      maandRente *
      Math.pow(1 + maandRente, aantalMaanden)) /
    (Math.pow(1 + maandRente, aantalMaanden) - 1);

  return roundMoney(maandlast);
}

export function berekenTotaleInterest(
  maandlast: number,
  looptijdJaren: number,
  geleendBedrag: number,
): number {
  return roundMoney(maandlast * looptijdJaren * 12 - geleendBedrag);
}

export function berekenEersteJaarInterest(
  geleendBedrag: number,
  jaarlijkseRente: number,
  looptijdJaren: number,
): number {
  const maandlast = berekenMaandlast(
    geleendBedrag,
    jaarlijkseRente,
    looptijdJaren,
  );
  const maandRente = jaarlijkseRente / 12;
  let openstaandSaldo = geleendBedrag;
  let interestTotaal = 0;

  for (let maand = 0; maand < Math.min(12, looptijdJaren * 12); maand += 1) {
    const interestMaand = openstaandSaldo * maandRente;
    const kapitaalMaand = maandlast - interestMaand;
    interestTotaal += interestMaand;
    openstaandSaldo -= kapitaalMaand;
  }

  return roundMoney(interestTotaal);
}

function berekenDstiCheck(
  input: LeningInput,
  maandlast: number,
  assumptions: string[],
  issues: CalculationIssue[],
): DstiCheckResult | undefined {
  if (input.nettoMaandinkomen === undefined || input.nettoMaandinkomen <= 0) {
    return undefined;
  }

  if (input.alleenstaand === undefined) {
    addIssue(
      issues,
      "info",
      "lening_dsti_huishouden_ontbreekt",
      "DSTI werd niet getoond omdat de huishoudsituatie (alleenstaand of niet) ontbreekt.",
    );

    return undefined;
  }

  assumptions.push(
    "De DSTI-check gebruikt praktische haalbaarheidsvuistregels en is geen officiele bankgoedkeuring of wettelijke grens.",
  );

  const kinderen = Math.max(0, input.aantalKinderenTenLaste ?? 0);
  const grensPercentage =
    input.nettoMaandinkomen <= DSTI_HEURISTIEK.drempelInkomen
      ? DSTI_HEURISTIEK.grensOnderDrempel
      : DSTI_HEURISTIEK.grensBovenDrempel;
  const resterendBedrag = roundMoney(input.nettoMaandinkomen - maandlast);
  const minimaalResterendBedrag =
    (input.alleenstaand
      ? DSTI_HEURISTIEK.minimaalResterendAlleenstaand
      : DSTI_HEURISTIEK.minimaalResterendKoppel) +
    kinderen * DSTI_HEURISTIEK.minimaalResterendPerKind;
  const dsti = maandlast / input.nettoMaandinkomen;
  const haalbaar =
    dsti <= grensPercentage && resterendBedrag >= minimaalResterendBedrag;

  if (dsti > grensPercentage) {
    addIssue(
      issues,
      "warning",
      "lening_dsti_boven_grens",
      "De maandlast zit boven de gebruikte DSTI-vuistregel. Dat maakt het dossier in de praktijk gevoeliger.",
    );
  }

  if (resterendBedrag < minimaalResterendBedrag) {
    addIssue(
      issues,
      "warning",
      "lening_resterend_budget_te_laag",
      "Na de geschatte maandlast blijft minder vrij besteedbaar budget over dan de gebruikte vuistregel toelaat.",
    );
  }

  return {
    dsti: roundPercent(dsti),
    grensPercentage: roundPercent(grensPercentage),
    haalbaar,
    resterendBedrag,
    minimaalResterendBedrag,
  };
}

export function berekenLening(
  input: LeningInput,
): Module4Result {
  const assumptions: string[] = [];
  const issues: CalculationIssue[] = [];

  if (input.geleendBedrag === undefined || input.geleendBedrag <= 0) {
    addIssue(
      issues,
      "missing",
      "lening_bedrag_verplicht",
      "Geef een geleend bedrag op om de lening te kunnen berekenen.",
    );
  }

  if (input.jaarlijkseRente === undefined || input.jaarlijkseRente < 0) {
    addIssue(
      issues,
      "missing",
      "lening_rente_verplicht",
      "Geef een jaarlijkse rentevoet op om de lening te kunnen berekenen.",
    );
  }

  if (input.looptijdJaren === undefined || input.looptijdJaren <= 0) {
    addIssue(
      issues,
      "missing",
      "lening_looptijd_verplicht",
      "Geef een looptijd in jaren op om de lening te kunnen berekenen.",
    );
  }

  if (!input.type) {
    addIssue(
      issues,
      "info",
      "lening_type_ontbreekt",
      "Het leningtype ontbreekt. Voor de annuiteitenformule maakt dat geen verschil, maar voor de dossierduiding wel.",
    );
  }

  if (issues.some((issue) => issue.level === "missing")) {
    return {
      status: "partial",
      assumptions,
      issues,
      sources: VERIFIED_SOURCES,
    };
  }

  const maandlast = berekenMaandlast(
    input.geleendBedrag ?? 0,
    input.jaarlijkseRente ?? 0,
    input.looptijdJaren ?? 0,
  );
  const totaleInterest = berekenTotaleInterest(
    maandlast,
    input.looptijdJaren ?? 0,
    input.geleendBedrag ?? 0,
  );
  const totaleTerugbetaling = roundMoney(
    (input.geleendBedrag ?? 0) + totaleInterest,
  );
  const eersteJaarInterest = berekenEersteJaarInterest(
    input.geleendBedrag ?? 0,
    input.jaarlijkseRente ?? 0,
    input.looptijdJaren ?? 0,
  );

  let quotiteitCheck: QuotiteitCheckResult | undefined;

  if (input.aankoopprijs !== undefined && input.aankoopprijs > 0) {
    const richtlijn = bepaalQuotiteitRichtlijn(input.aankoopSituatie);
    const ltv = (input.geleendBedrag ?? 0) / input.aankoopprijs;

    quotiteitCheck = {
      ltv: roundPercent(ltv),
      richtlijnMax: richtlijn?.richtlijnMax
        ? roundPercent(richtlijn.richtlijnMax)
        : undefined,
      voldoetAanRichtlijn:
        richtlijn?.richtlijnMax !== undefined ? ltv <= richtlijn.richtlijnMax : undefined,
      label: richtlijn?.label,
    };

    assumptions.push(
      "De quotiteitscheck gebruikt de aankoopprijs als benadering van de vastgoedwaarde, exclusief aankoopkosten.",
    );

    if (
      richtlijn?.richtlijnMax !== undefined &&
      ltv > richtlijn.richtlijnMax
    ) {
      addIssue(
        issues,
        "warning",
        "lening_hoge_quotiteit",
        "De gevraagde lening ligt boven de gebruikelijke prudentiele quotiteitsrichtlijn voor dit type dossier.",
      );
    }

    if (input.aankoopSituatie === "investering_of_tweede" && ltv > 0.7) {
      addIssue(
        issues,
        "info",
        "lening_investeringsinbreng",
        "Bij investeringsvastgoed ligt de praktijk vaak op ongeveer 20% tot 30% eigen inbreng. Dit blijft een marktvuistregel, geen wettelijk verbod.",
      );
    }
  }

  const dstiCheck = berekenDstiCheck(input, maandlast, assumptions, issues);

  return {
    status: "complete",
    maandlast,
    totaleInterest,
    totaleTerugbetaling,
    eersteJaarInterest,
    quotiteitCheck,
    dstiCheck,
    assumptions,
    issues,
    sources: VERIFIED_SOURCES,
  };
}
