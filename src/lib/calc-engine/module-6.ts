import type {
  CalculationIssue,
  CostLineItem,
  ErfSchijf,
  ErfenisInput,
  Gewest,
  Module6Result,
  SourceReference,
  Verwantschap,
} from "@/lib/calc-engine/types";

const VLAANDEREN_SOURCES: SourceReference[] = [
  {
    label: "Vlaamse Codex Fiscaliteit - tarieven erfbelasting",
    url: "https://codex.vlaanderen.be/PrintDocument.ashx?id=1031841&datum=&geannoteerd=false&print=false",
    verifiedAt: "2026-07-01",
  },
  {
    label: "Vlaanderen.be - algemeen tarief in de erfbelasting",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/erfbelasting/tarieven-in-de-erfbelasting/algemeen-tarief-in-de-erfbelasting",
    verifiedAt: "2026-07-01",
  },
  {
    label: "Vlaanderen.be - partnerabattement voor de roerende goederen",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/erfbelasting/partnerabattement-voor-de-roerende-goederen-in-de-erfbelasting",
    verifiedAt: "2026-07-01",
  },
  {
    label: "Vlaanderen.be - vrijstelling van de gezinswoning",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/erfbelasting/verminderingen-en-vrijstellingen-in-de-erfbelasting/vrijstelling-van-erfbelasting-op-de-gezinswoning-voor-de-langstlevende-partner",
    verifiedAt: "2026-07-01",
  },
  {
    label: "Vlaanderen.be - singlevermindering in de erfbelasting",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/erfbelasting/verminderingen-en-vrijstellingen-in-de-erfbelasting/singlevermindering-in-de-erfbelasting",
    verifiedAt: "2026-07-01",
  },
];

const BRUSSEL_SOURCES: SourceReference[] = [
  {
    label: "FOD Financien - droits de succession en Region de Bruxelles-Capitale",
    url: "https://fin.belgium.be/fr/particuliers/deces/droits-succession",
    verifiedAt: "2026-07-01",
  },
  {
    label: "FISCONETplus - legislation applicable en Region de Bruxelles-Capitale",
    url: "https://www.minfin.fgov.be/myminfin-web/pages/public/fisconet/document/7553a630-5078-4b62-9bfc-b6b1414db49c",
    verifiedAt: "2026-07-01",
  },
];

const WALLONIE_SOURCES: SourceReference[] = [
  {
    label: "FOD Financien - droits de succession en Region wallonne",
    url: "https://fin.belgium.be/fr/particuliers/deces/droits-succession",
    verifiedAt: "2026-07-01",
  },
  {
    label: "FISCONETplus - legislation applicable en Region wallonne",
    url: "https://www.minfin.fgov.be/myminfin-web/pages/public/fisconet/document/529774ef-ad5c-420d-bb6b-2ba51b8f3e63",
    verifiedAt: "2026-07-01",
  },
];

const ERFBELASTING_SCHIJVEN_VLAANDEREN: Record<Verwantschap, ErfSchijf[]> = {
  rechte_lijn_of_partner: [
    { tot: 50000, tarief: 0.03 },
    { tot: 250000, tarief: 0.09 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.27 },
  ],
  broer_zus: [
    { tot: 35000, tarief: 0.25 },
    { tot: 75000, tarief: 0.3 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.55 },
  ],
  oom_tante_neef_nicht: [
    { tot: 35000, tarief: 0.25 },
    { tot: 75000, tarief: 0.45 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.55 },
  ],
  anderen: [
    { tot: 35000, tarief: 0.25 },
    { tot: 75000, tarief: 0.45 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.55 },
  ],
};

const ERFBELASTING_SCHIJVEN_BRUSSEL: Record<Verwantschap, ErfSchijf[]> = {
  rechte_lijn_of_partner: [
    { tot: 50000, tarief: 0.03 },
    { tot: 100000, tarief: 0.08 },
    { tot: 175000, tarief: 0.09 },
    { tot: 250000, tarief: 0.18 },
    { tot: 500000, tarief: 0.24 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.3 },
  ],
  broer_zus: [
    { tot: 12500, tarief: 0.2 },
    { tot: 25000, tarief: 0.25 },
    { tot: 50000, tarief: 0.3 },
    { tot: 100000, tarief: 0.4 },
    { tot: 175000, tarief: 0.55 },
    { tot: 250000, tarief: 0.6 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.65 },
  ],
  oom_tante_neef_nicht: [
    { tot: 50000, tarief: 0.35 },
    { tot: 100000, tarief: 0.5 },
    { tot: 175000, tarief: 0.6 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.7 },
  ],
  anderen: [
    { tot: 50000, tarief: 0.4 },
    { tot: 75000, tarief: 0.55 },
    { tot: 175000, tarief: 0.65 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.8 },
  ],
};

const ERFBELASTING_SCHIJVEN_WALLONIE: Record<Verwantschap, ErfSchijf[]> = {
  rechte_lijn_of_partner: [
    { tot: 12500, tarief: 0.03 },
    { tot: 25000, tarief: 0.04 },
    { tot: 50000, tarief: 0.05 },
    { tot: 100000, tarief: 0.07 },
    { tot: 150000, tarief: 0.1 },
    { tot: 200000, tarief: 0.14 },
    { tot: 250000, tarief: 0.18 },
    { tot: 500000, tarief: 0.24 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.3 },
  ],
  broer_zus: [
    { tot: 12500, tarief: 0.2 },
    { tot: 25000, tarief: 0.25 },
    { tot: 75000, tarief: 0.35 },
    { tot: 175000, tarief: 0.5 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.65 },
  ],
  oom_tante_neef_nicht: [
    { tot: 12500, tarief: 0.25 },
    { tot: 25000, tarief: 0.3 },
    { tot: 75000, tarief: 0.4 },
    { tot: 175000, tarief: 0.55 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.7 },
  ],
  anderen: [
    { tot: 12500, tarief: 0.3 },
    { tot: 25000, tarief: 0.35 },
    { tot: 75000, tarief: 0.6 },
    { tot: 175000, tarief: 0.8 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.8 },
  ],
};

const VLAANDEREN_PARTNERABATTEMENT_ROEREND = 75000;
const BRUSSEL_ABATTEMENT_RECHTE_LIJN = 15000;
const WALLONIE_ABATTEMENT_RECHTE_LIJN_BASIS = 12500;
const WALLONIE_ABATTEMENT_RECHTE_LIJN_BESCHEIDEN = 25000;

function roundMoney(value: number): number {
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

function berekenProgressief(
  belastbaarBedrag: number,
  schijven: ErfSchijf[],
): number {
  let belasting = 0;
  let vorigeGrens = 0;

  for (const schijf of schijven) {
    const schijfBedrag = Math.min(belastbaarBedrag, schijf.tot) - vorigeGrens;

    if (schijfBedrag <= 0) {
      break;
    }

    belasting += schijfBedrag * schijf.tarief;
    vorigeGrens = schijf.tot;

    if (belastbaarBedrag <= schijf.tot) {
      break;
    }
  }

  return roundMoney(belasting);
}

function getSourcesForGewest(gewest: Gewest): SourceReference[] {
  if (gewest === "vlaanderen") {
    return VLAANDEREN_SOURCES;
  }

  if (gewest === "brussel") {
    return BRUSSEL_SOURCES;
  }

  return WALLONIE_SOURCES;
}

function getSchijven(gewest: Gewest, verwantschap: Verwantschap): ErfSchijf[] {
  if (gewest === "vlaanderen") {
    return ERFBELASTING_SCHIJVEN_VLAANDEREN[verwantschap];
  }

  if (gewest === "brussel") {
    return ERFBELASTING_SCHIJVEN_BRUSSEL[verwantschap];
  }

  return ERFBELASTING_SCHIJVEN_WALLONIE[verwantschap];
}

function validateInput(input: ErfenisInput, issues: CalculationIssue[]) {
  if (input.onroerendAandeel === undefined || input.onroerendAandeel < 0) {
    addIssue(
      issues,
      "missing",
      "erfbelasting_onroerend_aandeel_verplicht",
      "Geef het onroerende aandeel op om de erfbelasting te berekenen.",
    );
  }

  if (input.roerendAandeel === undefined || input.roerendAandeel < 0) {
    addIssue(
      issues,
      "missing",
      "erfbelasting_roerend_aandeel_verplicht",
      "Geef het roerende aandeel op om de erfbelasting te berekenen.",
    );
  }

  if (!input.verwantschap) {
    addIssue(
      issues,
      "missing",
      "erfbelasting_verwantschap_verplicht",
      "Geef de verwantschap op om het juiste erfbelastingtarief te bepalen.",
    );
  }

  if (!input.gewest) {
    addIssue(
      issues,
      "missing",
      "erfbelasting_gewest_verplicht",
      "Geef het gewest op om het juiste erfbelastingstelsel te bepalen.",
    );
  }
}

function applyGezinswoningVrijstelling(args: {
  gewest: Gewest;
  onroerendAandeel: number;
  isLangstlevendePartner: boolean;
  isGezinswoning: boolean;
  assumptions: string[];
  breakdown: CostLineItem[];
}): number {
  if (!args.isLangstlevendePartner || !args.isGezinswoning) {
    return args.onroerendAandeel;
  }

  args.assumptions.push(
    args.gewest === "vlaanderen"
      ? "Voor Vlaanderen werd de gezinswoning volledig vrijgesteld omdat de input de langstlevende partner van de gezinswoning aanduidt."
      : args.gewest === "brussel"
        ? "Voor Brussel werd de gezinswoning vrijgesteld omdat de input de langstlevende partner van de gezinswoning aanduidt."
        : "Voor Wallonie werd de gezinswoning vrijgesteld omdat de input de langstlevende partner van de gezinswoning aanduidt.",
  );

  args.breakdown.push({
    label:
      args.gewest === "vlaanderen"
        ? "Vrijstelling gezinswoning Vlaanderen"
        : args.gewest === "brussel"
          ? "Vrijstelling gezinswoning Brussel"
          : "Vrijstelling gezinswoning Wallonie",
    amount: roundMoney(args.onroerendAandeel),
    kind: "exact",
  });

  return 0;
}

function berekenVlaanderen(
  input: Required<
    Pick<
      ErfenisInput,
      | "onroerendAandeel"
      | "roerendAandeel"
      | "verwantschap"
      | "isLangstlevendePartner"
      | "isGezinswoning"
    >
  >,
  assumptions: string[],
  issues: CalculationIssue[],
  breakdown: CostLineItem[],
): Omit<Module6Result, "status" | "issues" | "assumptions" | "sources"> {
  const schijven = getSchijven("vlaanderen", input.verwantschap);
  const belastbareOnroerendeAandeel = applyGezinswoningVrijstelling({
    gewest: "vlaanderen",
    onroerendAandeel: roundMoney(input.onroerendAandeel),
    isLangstlevendePartner: input.isLangstlevendePartner,
    isGezinswoning: input.isGezinswoning,
    assumptions,
    breakdown,
  });
  let belastbareRoerendeAandeel = roundMoney(input.roerendAandeel);

  if (
    input.verwantschap === "rechte_lijn_of_partner" &&
    input.isLangstlevendePartner
  ) {
    const partnerabattement = Math.min(
      belastbareRoerendeAandeel,
      VLAANDEREN_PARTNERABATTEMENT_ROEREND,
    );

    if (partnerabattement > 0) {
      assumptions.push(
        "Voor Vlaanderen werd het partnerabattement van 75.000 euro op roerende goederen toegepast.",
      );
      belastbareRoerendeAandeel = roundMoney(
        belastbareRoerendeAandeel - partnerabattement,
      );
      breakdown.push({
        label: "Partnerabattement roerend Vlaanderen",
        amount: partnerabattement,
        kind: "exact",
      });
    }
  }

  if (
    input.verwantschap === "anderen" ||
    input.verwantschap === "oom_tante_neef_nicht"
  ) {
    addIssue(
      issues,
      "info",
      "erfbelasting_singlevermindering_niet_getoetst",
      "De Vlaamse singlevermindering werd niet automatisch toegepast omdat de vereiste testamentaire en familiale voorwaarden niet in de input zitten.",
    );
  }

  const totaleBelastbareGrondslag = roundMoney(
    belastbareOnroerendeAandeel + belastbareRoerendeAandeel,
  );
  const onroerendeErfbelasting =
    input.verwantschap === "rechte_lijn_of_partner"
      ? berekenProgressief(belastbareOnroerendeAandeel, schijven)
      : undefined;
  const roerendeErfbelasting =
    input.verwantschap === "rechte_lijn_of_partner"
      ? berekenProgressief(belastbareRoerendeAandeel, schijven)
      : undefined;
  const totaleErfbelasting =
    onroerendeErfbelasting !== undefined && roerendeErfbelasting !== undefined
      ? roundMoney(onroerendeErfbelasting + roerendeErfbelasting)
      : berekenProgressief(totaleBelastbareGrondslag, schijven);

  if (input.verwantschap === "rechte_lijn_of_partner") {
    breakdown.push(
      {
        label: "Belastbaar onroerend aandeel Vlaanderen",
        amount: belastbareOnroerendeAandeel,
        kind: "exact",
      },
      {
        label: "Belastbaar roerend aandeel Vlaanderen",
        amount: belastbareRoerendeAandeel,
        kind: "exact",
      },
    );
  } else {
    breakdown.push({
      label: "Belastbare grondslag Vlaanderen",
      amount: totaleBelastbareGrondslag,
      kind: "exact",
    });
  }

  return {
    gewest: "vlaanderen",
    verwantschap: input.verwantschap,
    belastbareOnroerendeAandeel,
    belastbareRoerendeAandeel,
    belastbareGrondslagTotaal: totaleBelastbareGrondslag,
    onroerendeErfbelasting,
    roerendeErfbelasting,
    totaleErfbelasting,
    breakdown,
  };
}

function requiresGroepsTotaal(
  gewest: Gewest,
  verwantschap: Verwantschap,
): boolean {
  return (
    gewest === "brussel" &&
    (verwantschap === "oom_tante_neef_nicht" || verwantschap === "anderen")
  );
}

function buildPartialResult(args: {
  gewest: Gewest;
  verwantschap: Verwantschap;
  belastbareOnroerendeAandeel: number;
  belastbareRoerendeAandeel: number;
  belastbareGrondslagTotaal: number;
  groepsTotaal?: number;
  breakdown: CostLineItem[];
  assumptions: string[];
  issues: CalculationIssue[];
}): Module6Result {
  return {
    status: "partial",
    gewest: args.gewest,
    verwantschap: args.verwantschap,
    belastbareOnroerendeAandeel: args.belastbareOnroerendeAandeel,
    belastbareRoerendeAandeel: args.belastbareRoerendeAandeel,
    belastbareGrondslagTotaal: args.belastbareGrondslagTotaal,
    groepsTotaal: args.groepsTotaal,
    breakdown: args.breakdown,
    assumptions: args.assumptions,
    issues: args.issues,
    sources: getSourcesForGewest(args.gewest),
  };
}

function berekenBrusselOfWallonie(
  input: Required<
    Pick<
      ErfenisInput,
      | "onroerendAandeel"
      | "roerendAandeel"
      | "verwantschap"
      | "gewest"
      | "isLangstlevendePartner"
      | "isGezinswoning"
    >
  > &
    Pick<ErfenisInput, "groepsTotaal">,
  assumptions: string[],
  issues: CalculationIssue[],
  breakdown: CostLineItem[],
): Module6Result {
  const belastbareOnroerendeAandeel = applyGezinswoningVrijstelling({
    gewest: input.gewest,
    onroerendAandeel: roundMoney(input.onroerendAandeel),
    isLangstlevendePartner: input.isLangstlevendePartner,
    isGezinswoning: input.isGezinswoning,
    assumptions,
    breakdown,
  });
  const belastbareRoerendeAandeel = roundMoney(input.roerendAandeel);
  let belastbareGrondslagTotaal = roundMoney(
    belastbareOnroerendeAandeel + belastbareRoerendeAandeel,
  );

  if (input.verwantschap === "rechte_lijn_of_partner") {
    if (input.gewest === "brussel") {
      const abattement = Math.min(
        belastbareGrondslagTotaal,
        BRUSSEL_ABATTEMENT_RECHTE_LIJN,
      );

      if (abattement > 0) {
        assumptions.push(
          "Voor Brussel werd het abattement van 15.000 euro in rechte lijn of tussen partners toegepast.",
        );
        belastbareGrondslagTotaal = roundMoney(
          belastbareGrondslagTotaal - abattement,
        );
        breakdown.push({
          label: "Abattement Brussel rechte lijn/partner",
          amount: abattement,
          kind: "exact",
        });
      }
    } else {
      const abattement =
        belastbareGrondslagTotaal <= 125000
          ? WALLONIE_ABATTEMENT_RECHTE_LIJN_BESCHEIDEN
          : WALLONIE_ABATTEMENT_RECHTE_LIJN_BASIS;
      const toegepastAbattement = Math.min(
        belastbareGrondslagTotaal,
        abattement,
      );

      if (toegepastAbattement > 0) {
        assumptions.push(
          `Voor Wallonie werd het abattement van ${abattement.toLocaleString("nl-BE")} euro in rechte lijn of tussen partners toegepast.`,
        );
        belastbareGrondslagTotaal = roundMoney(
          belastbareGrondslagTotaal - toegepastAbattement,
        );
        breakdown.push({
          label: "Abattement Wallonie rechte lijn/partner",
          amount: toegepastAbattement,
          kind: "exact",
        });
      }
    }
  }

  breakdown.push({
    label:
      input.gewest === "brussel"
        ? "Belastbare grondslag Brussel"
        : "Belastbare grondslag Wallonie",
    amount: belastbareGrondslagTotaal,
    kind: "exact",
  });

  if (requiresGroepsTotaal(input.gewest, input.verwantschap)) {
    if (input.groepsTotaal === undefined) {
      addIssue(
        issues,
        "missing",
        "erfbelasting_groeps_totaal_verplicht",
        "Voor deze Brusselse verwantschap wordt de erfbelasting eerst berekend op het gezamenlijke groepstotaal. Vul daarom ook het groepsTotaal van alle erfgenamen in dezelfde categorie in.",
      );

      return buildPartialResult({
        gewest: input.gewest,
        verwantschap: input.verwantschap,
        belastbareOnroerendeAandeel,
        belastbareRoerendeAandeel,
        belastbareGrondslagTotaal,
        breakdown,
        assumptions,
        issues,
      });
    }

    const groepsTotaal = roundMoney(input.groepsTotaal);

    if (groepsTotaal <= 0 || groepsTotaal < belastbareGrondslagTotaal) {
      addIssue(
        issues,
        "warning",
        "erfbelasting_groeps_totaal_ongeldig",
        "Het groepsTotaal moet positief zijn en minstens zo groot als het individuele belastbare aandeel.",
      );

      return buildPartialResult({
        gewest: input.gewest,
        verwantschap: input.verwantschap,
        belastbareOnroerendeAandeel,
        belastbareRoerendeAandeel,
        belastbareGrondslagTotaal,
        groepsTotaal,
        breakdown,
        assumptions,
        issues,
      });
    }

    const erfbelastingOpGroepsTotaal = berekenProgressief(
      groepsTotaal,
      getSchijven(input.gewest, input.verwantschap),
    );
    const proRataFactorRaw = belastbareGrondslagTotaal / groepsTotaal;
    const proRataFactor = Number(proRataFactorRaw.toFixed(6));
    const totaleErfbelasting = roundMoney(
      erfbelastingOpGroepsTotaal * proRataFactorRaw,
    );

    breakdown.push({
      label:
        input.gewest === "brussel"
          ? "Groepstotaal Brussel"
          : "Groepstotaal Wallonie",
      amount: groepsTotaal,
      kind: "exact",
    });

    return {
      status: "complete",
      gewest: input.gewest,
      verwantschap: input.verwantschap,
      belastbareOnroerendeAandeel,
      belastbareRoerendeAandeel,
      belastbareGrondslagTotaal,
      groepsTotaal,
      erfbelastingOpGroepsTotaal,
      proRataFactor,
      totaleErfbelasting,
      breakdown,
      assumptions,
      issues,
      sources: getSourcesForGewest(input.gewest),
    };
  }

  return {
    status: "complete",
    gewest: input.gewest,
    verwantschap: input.verwantschap,
    belastbareOnroerendeAandeel,
    belastbareRoerendeAandeel,
    belastbareGrondslagTotaal,
    totaleErfbelasting: berekenProgressief(
      belastbareGrondslagTotaal,
      getSchijven(input.gewest, input.verwantschap),
    ),
    breakdown,
    assumptions,
    issues,
    sources: getSourcesForGewest(input.gewest),
  };
}

export function berekenErfbelasting(input: ErfenisInput): Module6Result {
  const assumptions: string[] = [];
  const issues: CalculationIssue[] = [];
  const breakdown: CostLineItem[] = [];

  validateInput(input, issues);

  if (issues.some((issue) => issue.level === "missing")) {
    return {
      status: "partial",
      breakdown,
      assumptions,
      issues,
      sources: input.gewest ? getSourcesForGewest(input.gewest) : [],
    };
  }

  const resolvedInput = {
    onroerendAandeel: roundMoney(input.onroerendAandeel ?? 0),
    roerendAandeel: roundMoney(input.roerendAandeel ?? 0),
    verwantschap: input.verwantschap as Verwantschap,
    gewest: input.gewest as Gewest,
    isLangstlevendePartner: input.isLangstlevendePartner ?? false,
    isGezinswoning: input.isGezinswoning ?? false,
    groepsTotaal:
      input.groepsTotaal !== undefined ? roundMoney(input.groepsTotaal) : undefined,
  };

  if (resolvedInput.gewest === "vlaanderen") {
    const result = berekenVlaanderen(
      resolvedInput,
      assumptions,
      issues,
      breakdown,
    );

    return {
      status: "complete",
      ...result,
      assumptions,
      issues,
      sources: getSourcesForGewest(resolvedInput.gewest),
    };
  }

  return berekenBrusselOfWallonie(
    resolvedInput,
    assumptions,
    issues,
    breakdown,
  );
}
