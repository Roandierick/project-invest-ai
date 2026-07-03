import type {
  CalculationIssue,
  CostLineItem,
  Module1Input,
  Module1Result,
  NotaryPurchaseActResult,
  RegistrationTaxResult,
  SourceReference,
} from "@/lib/calc-engine/types";

const VAT_RATE = 0.21;
const NOTARY_ADMINISTRATIVE_FEE_EXCL_VAT = 855;
// Sinds 1 juli 2022 geldt 100 euro voor notariële akten die aan
// hypothecaire overschrijving onderworpen zijn, zoals een aankoopakte.
// De wet van 18 mei 2022 bevestigt tegelijk dat andere notariele akten op
// het algemene basistarief van 50 euro blijven.
const WRITING_DUTY_EXCL_VAT = 100;
// FOD Financiën gebruikt hiervoor de actuele benaming "kantoor rechtszekerheid".
// Peildatum 2026-07-03: 285 euro per bevoegde dienst voor een akte die aan
// hypothecaire overschrijving onderworpen is, zoals een standaard aankoopakte.
const TRANSCRIPTION_FEE = 285;

const FLEMISH_MODEST_REDUCTION = 1867;
const FLEMISH_MODEST_LIMIT_STANDARD = 220000;
const FLEMISH_MODEST_LIMIT_CORE_CITY = 240000;
const BRUSSELS_ABATEMENT_LIMIT = 600000;
const BRUSSELS_ABATEMENT_TRANCHE = 200000;

const SCALE_J = {
  fixedPart: 285,
  bands: [
    { width: 7500, rate: 0.025 },
    { width: 10000, rate: 0.025 },
    { width: 12500, rate: 0.0175 },
    { width: 15495, rate: 0.0171 },
    { width: 18595, rate: 0.0114 },
    { width: 186005, rate: 0.0057 },
    { width: 249905, rate: 0.002 },
    { width: Number.POSITIVE_INFINITY, rate: 0.002 },
  ],
} as const;

const SCALE_JBIS = {
  fixedPart: 257,
  bands: [
    { width: 7500, rate: 0.025 },
    { width: 10000, rate: 0.025 },
    { width: 12500, rate: 0.02 },
    { width: 15495, rate: 0.015 },
    { width: 18595, rate: 0.005 },
    { width: 186005, rate: 0.00485 },
    { width: 249905, rate: 0.003 },
    { width: Number.POSITIVE_INFINITY, rate: 0.002 },
  ],
} as const;

const VERIFIED_SOURCES: SourceReference[] = [
  {
    label: "Vlaanderen - tarief enige eigen woning",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/tarieven-in-het-verkooprecht/verlaagd-tarief-in-het-verkooprecht-voor-de-aankoop-van-de-enige-eigen-woning",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Vlaanderen - bijkomende vermindering bescheiden woning",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/verminderingen-van-het-verkooprecht/bijkomende-vermindering-van-het-verkooprecht-voor-een-enige-eigen-bescheiden-woning",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Vlaanderen - beroepsverkoper",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/tarieven-in-het-verkooprecht/het-verkooprecht-voor-aankopen-door-beroepsverkopers",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Vlaanderen - IER overgangsregeling",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/tarieven-in-het-verkooprecht/aanvullend-verlaagd-tarief-voor-de-aankoop-van-de-enige-eigen-woning-met-verbintenis-tot-ingrijpende-energetische-renovatie",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Vlaanderen - beschermd monument",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/tarieven-in-het-verkooprecht/tarief-van-1-bij-beschermde-monumenten-als-enige-eigen-woning",
    verifiedAt: "2026-06-21",
  },
  {
    label: "SPF Finances - Brussel en Wallonië registratierechten",
    url: "https://fin.belgium.be/fr/particuliers/habitation/acheter-vendre/droit-enregistrement",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Fednot tariefbesluit 2026",
    url: "https://www.notaris.be/sites/default/files/files/2026-02/20260209%20-%20Tariefbesluit%20geconsolideerde%20versie%20NL_0.pdf",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Belgisch Staatsblad - recht op geschriften voor overschrijfbare notariële akten",
    url: "https://www.ejustice.just.fgov.be/cgi/article_body.pl?language=nl&caller=summary&pub_date=22-05-30&numac=2022020909",
    verifiedAt: "2026-06-21",
  },
  {
    label: "FOD Financiën - hypothecaire retributie bij overschrijving",
    url: "https://fin.belgium.be/nl/particulieren/overlijden/onroerend-goed-verkopen",
    verifiedAt: "2026-06-21",
  },
  {
    label:
      "Belgisch Staatsblad - Wet 18 mei 2022, art. 3-4 (in werking 2022-07-01): algemene notariele akten 50 euro, aankoopakte met hypothecaire overschrijving 100 euro recht op geschriften",
    url: "https://www.ejustice.just.fgov.be/cgi/article_body.pl?language=nl&caller=summary&pub_date=22-05-30&numac=2022020909",
    verifiedAt: "2026-07-03",
  },
  {
    label:
      "FOD Financien - kantoor rechtszekerheid (peildatum 2026-07-03): 285 euro hypothecaire retributie per bevoegde dienst voor een aankoopakte met hypothecaire overschrijving",
    url: "https://fin.belgium.be/nl/particulieren/overlijden/onroerend-goed-verkopen",
    verifiedAt: "2026-07-03",
  },
  {
    label: "Notaris aankoopkostenmodule",
    url: "https://www.notaris.be/rekenmodules/wonen/aankoopkosten-van-een-woning-en/bouwgrond-berekenen",
    verifiedAt: "2026-06-21",
  },
];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundWholeEuro(value: number): number {
  return Math.round(value);
}

function addIssue(
  list: CalculationIssue[],
  level: CalculationIssue["level"],
  code: string,
  message: string,
) {
  list.push({ level, code, message });
}

function parseComparableDate(value?: string): number | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  return Number(`${match[1]}${match[2]}${match[3]}`);
}

function isOnOrAfter(value: string | undefined, threshold: string): boolean {
  const comparableValue = parseComparableDate(value);
  const comparableThreshold = parseComparableDate(threshold);

  if (comparableValue === null || comparableThreshold === null) {
    return false;
  }

  return comparableValue >= comparableThreshold;
}

function isBefore(value: string | undefined, threshold: string): boolean {
  const comparableValue = parseComparableDate(value);
  const comparableThreshold = parseComparableDate(threshold);

  if (comparableValue === null || comparableThreshold === null) {
    return false;
  }

  return comparableValue < comparableThreshold;
}

export function berekenNotarisEreloonAankoop(
  aankoopprijs: number,
  schaal: "J" | "Jbis",
): number {
  const normalizedPrice = roundWholeEuro(aankoopprijs);
  const config = schaal === "Jbis" ? SCALE_JBIS : SCALE_J;
  let remaining = normalizedPrice;
  let honorarium = config.fixedPart;

  if (normalizedPrice <= 20000) {
    honorarium -= 86;
  }

  for (const band of config.bands) {
    if (remaining <= 0) {
      break;
    }

    const taxableChunk = Math.min(remaining, band.width);
    honorarium += taxableChunk * band.rate;
    remaining -= taxableChunk;
  }

  return roundWholeEuro(honorarium);
}

function isOwnHomeTrack(input: Module1Input): boolean {
  return (
    input.aankoopSituatie === "enige_eigen_woning" ||
    input.aankoopSituatie === "ingrijpende_energetische_renovatie" ||
    input.aankoopSituatie === "beschermd_monument"
  );
}

function bepaalNotarisSchaal(input: Module1Input) {
  const assumptions: string[] = [];
  const issues: CalculationIssue[] = [];

  if (!isOwnHomeTrack(input)) {
    return { scale: "J" as const, assumptions, issues };
  }

  if (input.heeftAndereWoningInVolleEigendom === true) {
    if (input.verkooptAndereWoningBinnenTolerantie === true) {
      addIssue(
        issues,
        "info",
        "jbis_niet_bij_verkoopverbintenis",
        "Voor het notarisereloon geldt schaal Jbis niet als u nog een andere woning bezit, zelfs wanneer u die later verkoopt binnen de fiscale tolerantie.",
      );
    }

    return { scale: "J" as const, assumptions, issues };
  }

  if (input.heeftAndereWoningInVolleEigendom !== false) {
    addIssue(
      issues,
      "missing",
      "jbis_andere_woning_status_verplicht",
      "Geef expliciet aan of de kopers nog een andere woning in volle eigendom bezitten om te bepalen of schaal Jbis mag worden toegepast.",
    );

    return { scale: "J" as const, assumptions, issues };
  }

  return { scale: "Jbis" as const, assumptions, issues };
}

export function berekenRegistratiebelasting(
  input: Module1Input,
): RegistrationTaxResult {
  const issues: CalculationIssue[] = [];
  const assumptions: string[] = [];
  const conditions: string[] = [];

  if (input.aankoopprijs === undefined || input.aankoopprijs <= 0) {
    addIssue(
      issues,
      "missing",
      "aankoopprijs_verplicht",
      "Geef een aankoopprijs op om de registratiebelasting te kunnen berekenen.",
    );
  }

  if (!input.gewest) {
    addIssue(
      issues,
      "missing",
      "gewest_verplicht",
      "Geef het gewest op om het juiste registratietarief te bepalen.",
    );
  }

  if (!input.aankoopSituatie) {
    addIssue(
      issues,
      "missing",
      "situatie_verplicht",
      "Geef aan of het om een investering, enige eigen woning of een bijzondere regeling gaat.",
    );
  }

  if (issues.some((issue) => issue.level === "missing")) {
    return { assumptions, conditions, issues };
  }

  const taxBase = roundMoney(input.belastbareGrondslag ?? input.aankoopprijs ?? 0);

  if (input.belastbareGrondslag === undefined) {
    assumptions.push(
      "De belastbare grondslag werd gelijkgesteld aan de aankoopprijs. Eventuele lasten of een hogere venale waarde zitten hier nog niet in.",
    );
  }

  let applicableRate: number | undefined;
  let amount: number | undefined;
  let reductionAmount = 0;
  let abatementAmount = 0;
  let ruleLabel: string | undefined;

  if (input.gewest === "vlaanderen") {
    switch (input.aankoopSituatie) {
      case "investering_of_tweede":
        applicableRate = 0.12;
        ruleLabel = "Vlaanderen - algemeen tarief";
        break;
      case "beroepsverkoper":
        applicableRate = isBefore(input.compromisDatum, "2025-01-01") ? 0.04 : 0.06;
        ruleLabel = "Vlaanderen - beroepsverkoper";

        if (!input.compromisDatum) {
          addIssue(
            issues,
            "missing",
            "compromisdatum_verplicht_beroepsverkoper",
            "Geef de compromisdatum op om te bepalen of voor beroepsverkopers nog het historische tarief van 4% of het actuele tarief van 6% geldt.",
          );
          assumptions.push(
            "Omdat geen compromisdatum is ingevuld, werd conservatief het actuele tarief van 6% voor beroepsverkopers gebruikt.",
          );
        }
        break;
      case "enige_eigen_woning":
        applicableRate =
          input.authentiekeAkteDatum === undefined
            ? 0.03
            : isBefore(input.authentiekeAkteDatum, "2025-01-01")
              ? 0.03
              : 0.02;
        ruleLabel = "Vlaanderen - enige eigen woning";
        conditions.push(
          "Het moet gaan om een zuivere aankoop door natuurlijke personen.",
          "De koper moet zich binnen 3 jaar domiciliëren in de woning.",
          "Voor verkoopovereenkomsten vanaf 1 januari 2026 moet die inschrijving minstens 1 jaar ononderbroken behouden blijven.",
        );

        if (!input.authentiekeAkteDatum) {
          addIssue(
            issues,
            "missing",
            "authentieke_akte_datum_verplicht_enige_eigen_woning",
            "Geef de datum van de authentieke akte op om te bepalen of het historische tarief van 3% of het actuele tarief van 2% geldt.",
          );
          assumptions.push(
            "Omdat geen datum van de authentieke akte is ingevuld, werd conservatief het tarief van 3% gebruikt.",
          );
        }

        if (
          isOnOrAfter(input.compromisDatum, "2026-01-01") &&
          input.kopersZijnUitsluitendNatuurlijkePersonen === false
        ) {
          applicableRate = 0.12;
          ruleLabel = "Vlaanderen - algemeen tarief";
          addIssue(
            issues,
            "warning",
            "gemengde_kopers_verlies_verlaagd_tarief",
            "Vanaf 1 januari 2026 vervalt het 2%-tarief als een rechtspersoon mee aankoopt.",
          );
        }

        if (
          isOnOrAfter(input.compromisDatum, "2026-01-01") &&
          input.verwervingInVolleEigendom === false
        ) {
          applicableRate = 0.12;
          ruleLabel = "Vlaanderen - algemeen tarief";
          addIssue(
            issues,
            "warning",
            "gesplitste_aankoop_verlies_verlaagd_tarief",
            "Vanaf 1 januari 2026 komen gesplitste aankopen niet meer in aanmerking voor het 2%-tarief.",
          );
        }

        if (
          input.heeftAndereWoningInVolleEigendom === true &&
          input.verkooptAndereWoningBinnenTolerantie !== true
        ) {
          applicableRate = 0.12;
          ruleLabel = "Vlaanderen - algemeen tarief";
          addIssue(
            issues,
            "warning",
            "andere_woning_blokkeert_tarief",
            "Het 2%-tarief geldt niet als er nog een andere woning in volle eigendom behouden blijft.",
          );
        }
        break;
      case "ingrijpende_energetische_renovatie":
        conditions.push(
          "Het historische 1%-tarief geldt alleen voor verkoopovereenkomsten gesloten vóór 1 januari 2025.",
        );

        if (!input.compromisDatum) {
          addIssue(
            issues,
            "missing",
            "compromisdatum_verplicht_ier",
            "Geef de compromisdatum op om te weten of de vroegere 1%-regeling voor ingrijpende energetische renovatie nog toepasbaar was.",
          );
          return { taxBase, assumptions, conditions, issues };
        }

        if (isBefore(input.compromisDatum, "2025-01-01")) {
          applicableRate = isBefore(input.authentiekeAkteDatum, "2022-01-01")
            ? 0.05
            : 0.01;
          ruleLabel = "Vlaanderen - historische IER-regeling";
        } else {
          applicableRate = isBefore(input.authentiekeAkteDatum, "2025-01-01")
            ? 0.03
            : 0.02;
          ruleLabel = "Vlaanderen - enige eigen woning";
          addIssue(
            issues,
            "warning",
            "ier_afgeschaft",
            "De aparte IER-regeling werd afgeschaft voor compromissen vanaf 1 januari 2025. De berekening valt daarom terug op het gewone tarief van de enige eigen woning.",
          );
        }
        break;
      case "beschermd_monument":
        conditions.push(
          "Het historische 1%-tarief gold alleen voor een beschermd monument als enige eigen woning bij verkoopovereenkomsten gesloten vóór 1 januari 2025.",
        );

        if (!input.compromisDatum) {
          addIssue(
            issues,
            "missing",
            "compromisdatum_verplicht_monument",
            "Geef de compromisdatum op om te weten of de vroegere monumentenregeling nog van toepassing was.",
          );
          return { taxBase, assumptions, conditions, issues };
        }

        if (isBefore(input.compromisDatum, "2025-01-01")) {
          applicableRate = 0.01;
          ruleLabel = "Vlaanderen - historisch monumententarief";
        } else {
          addIssue(
            issues,
            "warning",
            "monument_regime_vervallen",
            "De specifieke monumentenregeling is afgeschaft voor verkoopovereenkomsten vanaf 1 januari 2025. Kies de actuele aankoopsituatie om het juiste tarief te krijgen.",
          );
          return { taxBase, assumptions, conditions, issues };
        }
        break;
    }

    if (
      input.aankoopSituatie === "enige_eigen_woning" &&
      applicableRate === 0.02
    ) {
      if (taxBase <= FLEMISH_MODEST_LIMIT_STANDARD) {
        reductionAmount = FLEMISH_MODEST_REDUCTION;
      } else if (
        taxBase <= FLEMISH_MODEST_LIMIT_CORE_CITY &&
        input.ligtInKernstadOfVlaamseRand === true
      ) {
        reductionAmount = FLEMISH_MODEST_REDUCTION;
      } else if (
        taxBase <= FLEMISH_MODEST_LIMIT_CORE_CITY &&
        input.ligtInKernstadOfVlaamseRand === undefined
      ) {
        addIssue(
          issues,
          "info",
          "kernstad_onzeker",
          "De aankoopprijs zit boven €220.000 maar onder €240.000. Geef aan of het pand in een kernstad of de Vlaamse Rand ligt om de extra vermindering correct te beoordelen.",
        );
      }
    }
  }

  if (input.gewest === "brussel") {
    applicableRate = 0.125;

    if (input.aankoopSituatie === "enige_eigen_woning") {
      ruleLabel = "Brussel - hoofdverblijf met abattement";
      conditions.push(
        "Het abattement geldt voor een aankoop in volle eigendom door natuurlijke personen.",
        "U mag op datum van de aankoop geen andere woning in volle eigendom bezitten, behalve via de teruggaafregeling na verkoop binnen 2 jaar.",
        "U moet uw hoofdverblijf binnen 3 jaar vestigen en minstens 5 jaar behouden.",
      );

      if (input.kopersZijnUitsluitendNatuurlijkePersonen === undefined) {
        addIssue(
          issues,
          "missing",
          "kopers_natuurlijke_personen_verplicht_brussel",
          "Bevestig expliciet of alle kopers natuurlijke personen zijn om het Brusselse abattement te beoordelen.",
        );
      }

      if (input.verwervingInVolleEigendom === undefined) {
        addIssue(
          issues,
          "missing",
          "volle_eigendom_verplicht_brussel",
          "Bevestig expliciet of de aankoop in volle eigendom gebeurt om het Brusselse abattement te beoordelen.",
        );
      }

      const meetsExplicitConditions =
        input.kopersZijnUitsluitendNatuurlijkePersonen === true &&
        input.verwervingInVolleEigendom === true &&
        !(
          input.heeftAndereWoningInVolleEigendom === true &&
          input.verkooptAndereWoningBinnenTolerantie !== true
        );

      if (meetsExplicitConditions && taxBase <= BRUSSELS_ABATEMENT_LIMIT) {
        abatementAmount = Math.min(taxBase, BRUSSELS_ABATEMENT_TRANCHE);
      }

      if (taxBase > BRUSSELS_ABATEMENT_LIMIT) {
        addIssue(
          issues,
          "info",
          "geen_abattement_boven_limiet",
          "Voor woningen boven €600.000 is het Brusselse abattement niet toepasbaar.",
        );
      }
    } else {
      ruleLabel = "Brussel - standaardtarief";
    }
  }

  if (input.gewest === "wallonie") {
    applicableRate = 0.125;
    ruleLabel = "Wallonië - standaardtarief";

    if (input.aankoopSituatie === "enige_eigen_woning") {
      if (input.kopersZijnUitsluitendNatuurlijkePersonen === undefined) {
        addIssue(
          issues,
          "missing",
          "kopers_natuurlijke_personen_verplicht_wallonie",
          "Bevestig expliciet of alle kopers natuurlijke personen zijn om het Waalse 3%-tarief te beoordelen.",
        );
      }

      if (input.verwervingInVolleEigendom === undefined) {
        addIssue(
          issues,
          "missing",
          "volle_eigendom_verplicht_wallonie",
          "Bevestig expliciet of de aankoop in volle eigendom gebeurt om het Waalse 3%-tarief te beoordelen.",
        );
      }

      const blockedByExplicitConditions =
        input.kopersZijnUitsluitendNatuurlijkePersonen === false ||
        input.verwervingInVolleEigendom === false ||
        (input.heeftAndereWoningInVolleEigendom === true &&
          input.verkooptAndereWoningBinnenTolerantie !== true);

      const canApplyReducedRate =
        input.kopersZijnUitsluitendNatuurlijkePersonen === true &&
        input.verwervingInVolleEigendom === true &&
        !blockedByExplicitConditions;

      if (canApplyReducedRate) {
        applicableRate = 0.03;
        ruleLabel = "Wallonië - habitation propre et unique";
      }

      conditions.push(
        "Het pand moet uw hoofdverblijf worden.",
        "U moet zich binnen 3 jaar domiciliëren in een bestaande woning, of binnen 5 jaar bij bouwgrond of nieuwbouw.",
        "De hoofdverblijfplaats moet minstens 3 jaar behouden blijven.",
      );
    }
  }

  if (applicableRate === undefined) {
    return { taxBase, assumptions, conditions, issues };
  }

  amount = roundMoney(taxBase * applicableRate);

  if (abatementAmount > 0) {
    amount = roundMoney((taxBase - abatementAmount) * applicableRate);
  }

  const totalDue = Math.max(0, roundMoney(amount - reductionAmount));

  return {
    taxBase,
    applicableRate,
    amount,
    reductionAmount: reductionAmount || undefined,
    abatementAmount: abatementAmount || undefined,
    totalDue,
    ruleLabel,
    assumptions,
    conditions,
    issues,
  };
}

export function berekenNotariskostenAankoopakte(
  input: Module1Input,
): NotaryPurchaseActResult {
  const issues: CalculationIssue[] = [];
  const breakdown: CostLineItem[] = [];

  if (input.aankoopprijs === undefined || input.aankoopprijs <= 0) {
    addIssue(
      issues,
      "missing",
      "aankoopprijs_verplicht_notaris",
      "Geef een aankoopprijs op om het notarisereloon te berekenen.",
    );

    return { assumptions: [], issues, breakdown };
  }

  const scaleDecision = bepaalNotarisSchaal(input);
  const honorariumExclVat = berekenNotarisEreloonAankoop(
    input.aankoopprijs,
    scaleDecision.scale,
  );

  breakdown.push(
    { label: "Notarisereloon", amount: honorariumExclVat, kind: "exact" },
    {
      label: "Administratieve kosten",
      amount: NOTARY_ADMINISTRATIVE_FEE_EXCL_VAT,
      kind: "exact",
    },
    {
      label: "Recht op geschriften",
      amount: WRITING_DUTY_EXCL_VAT,
      kind: "exact",
    },
    {
      label: "Overschrijving kantoor rechtszekerheid",
      amount: TRANSCRIPTION_FEE,
      kind: "exact",
    },
  );

  const knownVatBase =
    honorariumExclVat +
    NOTARY_ADMINISTRATIVE_FEE_EXCL_VAT +
    WRITING_DUTY_EXCL_VAT;
  const knownVat = roundMoney(knownVatBase * VAT_RATE);
  let estimatedVat = 0;

  if (input.geschatteUitgavenAanDerdenExclBtw !== undefined) {
    estimatedVat = roundMoney(
      input.geschatteUitgavenAanDerdenExclBtw * VAT_RATE,
    );
    breakdown.push({
      label: "Uitgaven aan derden",
      amount: input.geschatteUitgavenAanDerdenExclBtw,
      kind: "estimate",
    });
  } else {
    addIssue(
      issues,
      "info",
      "uitgaven_aan_derden_ontbreken",
      "De variabele uitgaven aan derden zijn nog niet meegerekend. Het totaal blijft dus een ondergrens tot die raming is ingevuld.",
    );
  }

  const vat = roundMoney(knownVat + estimatedVat);
  const totalKnown = roundMoney(
    honorariumExclVat +
      NOTARY_ADMINISTRATIVE_FEE_EXCL_VAT +
      WRITING_DUTY_EXCL_VAT +
      TRANSCRIPTION_FEE +
      knownVat,
  );

  const totalWithEstimate =
    input.geschatteUitgavenAanDerdenExclBtw !== undefined
      ? roundMoney(
          totalKnown +
            input.geschatteUitgavenAanDerdenExclBtw +
            estimatedVat,
        )
      : undefined;

  breakdown.push({ label: "Btw (21%)", amount: knownVat, kind: "exact" });

  if (estimatedVat > 0) {
    breakdown.push({
      label: "Btw op raming uitgaven derden",
      amount: estimatedVat,
      kind: "estimate",
    });
  }

  return {
    honorariumScale: scaleDecision.scale,
    honorariumExclVat,
    administrativeFeeExclVat: NOTARY_ADMINISTRATIVE_FEE_EXCL_VAT,
    writingDutyExclVat: WRITING_DUTY_EXCL_VAT,
    transcriptionFee: TRANSCRIPTION_FEE,
    estimatedThirdPartyCostsExclVat: input.geschatteUitgavenAanDerdenExclBtw,
    vat,
    totalKnown,
    totalWithEstimate,
    assumptions: scaleDecision.assumptions,
    issues: [...scaleDecision.issues, ...issues],
    breakdown,
  };
}

export function berekenAankoopKostenModule1(
  input: Module1Input,
): Module1Result {
  const registrationTax = berekenRegistratiebelasting(input);
  const notaryPurchaseAct = berekenNotariskostenAankoopakte(input);

  const combinedIssues = [
    ...registrationTax.issues,
    ...notaryPurchaseAct.issues,
  ];

  const totalExtraCostsKnown =
    registrationTax.totalDue !== undefined &&
    notaryPurchaseAct.totalKnown !== undefined
      ? roundMoney(registrationTax.totalDue + notaryPurchaseAct.totalKnown)
      : undefined;

  const totalExtraCostsWithEstimate =
    registrationTax.totalDue !== undefined &&
    notaryPurchaseAct.totalWithEstimate !== undefined
      ? roundMoney(registrationTax.totalDue + notaryPurchaseAct.totalWithEstimate)
      : undefined;

  const totalProjectBudgetKnown =
    input.aankoopprijs !== undefined && totalExtraCostsKnown !== undefined
      ? roundMoney(input.aankoopprijs + totalExtraCostsKnown)
      : undefined;

  const totalProjectBudgetWithEstimate =
    input.aankoopprijs !== undefined && totalExtraCostsWithEstimate !== undefined
      ? roundMoney(input.aankoopprijs + totalExtraCostsWithEstimate)
      : undefined;

  const hasMissingIssues = combinedIssues.some((issue) => issue.level === "missing");
  const isComplete =
    !hasMissingIssues &&
    registrationTax.totalDue !== undefined &&
    notaryPurchaseAct.totalWithEstimate !== undefined;

  return {
    status: isComplete ? "complete" : "partial",
    registrationTax,
    notaryPurchaseAct,
    totalExtraCostsKnown,
    totalExtraCostsWithEstimate,
    totalProjectBudgetKnown,
    totalProjectBudgetWithEstimate,
    issues: combinedIssues,
    sources: VERIFIED_SOURCES,
  };
}
