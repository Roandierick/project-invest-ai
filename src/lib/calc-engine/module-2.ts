import type {
  CalculationIssue,
  Module2Result,
  OVInput,
  OVReductionLineItem,
  SourceReference,
} from "@/lib/calc-engine/types";
import {
  lookupVlaamseOpcentiemen,
  VLABEL_OPCENTIEMEN_DATASET_URL,
} from "@/lib/enrichment/vlabel";

const VLAAMSE_BASISHEFFING = 0.0397;

const VERIFIED_PARAMETERS_PER_AANSLAGJAAR = {
  2024: {
    indexatiecoefficient: 2.1763,
    kindBaseAmountPerQualifyingChild: 8.32,
    handicapBaseAmountPerPerson: 16.64,
  },
  2025: {
    indexatiecoefficient: 2.2446,
    kindBaseAmountPerQualifyingChild: 8.59,
    handicapBaseAmountPerPerson: 17.18,
  },
  2026: {
    indexatiecoefficient: 2.3,
    kindBaseAmountPerQualifyingChild: 8.8,
    handicapBaseAmountPerPerson: 17.6,
  },
} as const;

const LATEST_VERIFIED_AANSLAGJAAR = 2026;

const VERIFIED_SOURCES: SourceReference[] = [
  {
    label: "Vlaanderen - indexatiecoefficienten kadastraal inkomen",
    url: "https://www.vlaanderen.be/bouwen-wonen-en-energie/kopen-en-verkopen/het-kadastraal-inkomen",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Vlaanderen - berekening van de onroerende voorheffing",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/onroerende-voorheffing/berekening-van-de-onroerende-voorheffing",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Vlaanderen - aanslagvoeten per gemeente",
    url: "https://www.vlaanderen.be/lokaal-bestuur/financiering/opcentiemen-en-aanvullende-lokale-belastingen/aanslagvoeten-per-gemeente",
    verifiedAt: "2026-07-02",
  },
  {
    label: "Vlaanderen - overzicht opcentiemen 2026 (officiele dataset)",
    url: VLABEL_OPCENTIEMEN_DATASET_URL,
    verifiedAt: "2026-07-02",
  },
  {
    label: "Vlaanderen - vermindering voor gezinsbijslaggerechtigde kinderen",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/onroerende-voorheffing/verminderingen-van-de-onroerende-voorheffing/vermindering-van-de-onroerende-voorheffing-voor-gezinsbijslaggerechtigde-kinderen",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Vlaanderen - vermindering voor personen met een handicap",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/onroerende-voorheffing/verminderingen-van-de-onroerende-voorheffing/vermindering-van-de-onroerende-voorheffing-voor-personen-met-een-handicap",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Vlaanderen - wie betaalt de onroerende voorheffing",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/onroerende-voorheffing/wie-moet-de-onroerende-voorheffing-betalen",
    verifiedAt: "2026-06-21",
  },
  {
    label: "Statbel - bevolking per gemeente met NIS-code",
    url: "https://statbel.fgov.be/sites/default/files/files/documents/bevolking/5.1%20Structuur%20van%20de%20bevolking/Bevolking_per_gemeente.xlsx",
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

function bepaalAanslagjaar(
  input: OVInput,
  assumptions: string[],
): number | undefined {
  if (input.aanslagjaar !== undefined) {
    return input.aanslagjaar;
  }

  const comparableDate = parseComparableDate(input.authentiekeAkteDatum);

  if (comparableDate !== null) {
    const derivedYear = Number(String(comparableDate).slice(0, 4)) + 1;

    assumptions.push(
      "Het aanslagjaar werd afgeleid als het eerste kalenderjaar waarin de koper op 1 januari eigenaar is, dus het jaar na de authentieke akte.",
    );

    return derivedYear;
  }

  assumptions.push(
    `Omdat geen aanslagjaar of aktedatum is ingevuld, werd het laatst officieel geverifieerde aanslagjaar ${LATEST_VERIFIED_AANSLAGJAAR} gebruikt.`,
  );

  return LATEST_VERIFIED_AANSLAGJAAR;
}

function maakReductieLijn(
  label: string,
  baseAmount: number,
  provincialeOpcentiemen: number,
  gemeentelijkeOpcentiemen: number,
): OVReductionLineItem {
  const provincialIncrease = roundMoney(baseAmount * (provincialeOpcentiemen / 100));
  const municipalIncrease = roundMoney(baseAmount * (gemeentelijkeOpcentiemen / 100));

  return {
    label,
    baseAmount: roundMoney(baseAmount),
    provincialIncrease,
    municipalIncrease,
    totalAmount: roundMoney(baseAmount + provincialIncrease + municipalIncrease),
  };
}

export function berekenOnroerendeVoorheffingVlaanderen(
  input: OVInput,
): Module2Result {
  const assumptions: string[] = [];
  const issues: CalculationIssue[] = [];
  const reductionsApplied: OVReductionLineItem[] = [];

  if (input.nietGeindexeerdKI === undefined || input.nietGeindexeerdKI <= 0) {
    addIssue(
      issues,
      "missing",
      "ov_ki_verplicht",
      "Geef het niet-geindexeerde KI op om de onroerende voorheffing te kunnen berekenen.",
    );
  }

  if (!input.gemeenteNisCode) {
    if (!input.gemeenteNaam) {
      addIssue(
        issues,
        "missing",
        "ov_gemeente_verplicht",
        "Geef een gemeente of gemeente-NIS-code op om de geverifieerde opcentiemen te koppelen.",
      );
    } else {
      assumptions.push(
        "Omdat geen gemeente-NIS-code is ingevuld, werd geprobeerd de gemeentenaam rechtstreeks te koppelen aan de geverifieerde VLABEL-dataset.",
      );
    }
  }

  const aanslagjaar = bepaalAanslagjaar(input, assumptions);

  if (aanslagjaar === undefined) {
    return {
      status: "partial",
      assumptions,
      issues,
      reductionsApplied,
      sources: VERIFIED_SOURCES,
    };
  }

  const yearParameters =
    VERIFIED_PARAMETERS_PER_AANSLAGJAAR[
      aanslagjaar as keyof typeof VERIFIED_PARAMETERS_PER_AANSLAGJAAR
    ];

  if (!yearParameters) {
    addIssue(
      issues,
      "missing",
      "ov_aanslagjaar_niet_geverifieerd",
      `Aanslagjaar ${aanslagjaar} is nog niet tegen een officiele bron geverifieerd. Daarom wordt geen OV-bedrag gegokt.`,
    );

    return {
      status: "partial",
      aanslagjaar,
      assumptions,
      issues,
      reductionsApplied,
      sources: VERIFIED_SOURCES,
    };
  }

  if (issues.some((issue) => issue.level === "missing")) {
    return {
      status: "partial",
      aanslagjaar,
      indexatiecoefficient: yearParameters.indexatiecoefficient,
      basisheffingRate: VLAAMSE_BASISHEFFING,
      assumptions,
      issues,
      reductionsApplied,
      sources: VERIFIED_SOURCES,
    };
  }

  const municipalityLookup = lookupVlaamseOpcentiemen({
    nisCode: input.gemeenteNisCode,
    gemeenteNaam: input.gemeenteNaam,
  });

  if (!municipalityLookup) {
    addIssue(
      issues,
      "missing",
      "ov_gemeente_niet_in_dataset",
      "De gemeente kon niet aan de geverifieerde VLABEL-opcentiemen voor Vlaanderen gekoppeld worden. Geef een actuele Vlaamse gemeente of geldige NIS-code op.",
    );

    return {
      status: "partial",
      aanslagjaar,
      indexatiecoefficient: yearParameters.indexatiecoefficient,
      basisheffingRate: VLAAMSE_BASISHEFFING,
      assumptions,
      issues,
      reductionsApplied,
      sources: VERIFIED_SOURCES,
    };
  }

  if (municipalityLookup.kind === "differentiated") {
    addIssue(
      issues,
      "missing",
      "ov_gemeente_gedifferentieerde_opcentiemen",
      `Voor ${municipalityLookup.record.gemeenteNaam} publiceert VLABEL alleen gedifferentieerde gemeentelijke opcentiemen. Zonder preciezer adres of deelgemeente wordt daarom geen enkel OV-bedrag gegokt.`,
    );

    return {
      status: "partial",
      aanslagjaar,
      indexatiecoefficient: yearParameters.indexatiecoefficient,
      basisheffingRate: VLAAMSE_BASISHEFFING,
      gemeente: municipalityLookup.record.gemeenteNaam,
      gemeenteNisCode: municipalityLookup.record.nisCode,
      provincialeOpcentiemen: municipalityLookup.record.provincialeOpcentiemen,
      assumptions,
      issues,
      reductionsApplied,
      sources: VERIFIED_SOURCES,
    };
  }

  const municipality = municipalityLookup.record;

  const geindexeerdKIRaw =
    input.nietGeindexeerdKI! * yearParameters.indexatiecoefficient;
  const geindexeerdKI = roundWholeEuro(geindexeerdKIRaw);
  const basisheffingAmount = roundMoney(geindexeerdKIRaw * VLAAMSE_BASISHEFFING);
  const provincialeAmount = roundMoney(
    basisheffingAmount * (municipality.provincialeOpcentiemen / 100),
  );
  const gemeentelijkeAmount = roundMoney(
    basisheffingAmount * (municipality.gemeentelijkeOpcentiemen / 100),
  );
  const brutoOnroerendeVoorheffing = roundMoney(
    basisheffingAmount + provincialeAmount + gemeentelijkeAmount,
  );

  if (input.isEigenWoningVanEigenaar === true) {
    const kinderenTenLaste = Math.max(0, Math.floor(input.kinderenTenLaste ?? 0));

    if (kinderenTenLaste >= 2) {
      reductionsApplied.push(
        maakReductieLijn(
          `${kinderenTenLaste} kwalificerende kinder(en) ten laste`,
          roundMoney(
            kinderenTenLaste * yearParameters.kindBaseAmountPerQualifyingChild,
          ),
          municipality.provincialeOpcentiemen,
          municipality.gemeentelijkeOpcentiemen,
        ),
      );
    } else if (kinderenTenLaste === 1) {
      addIssue(
        issues,
        "info",
        "ov_kinderen_minimum_twee",
        "De Vlaamse vermindering voor kinderen ten laste start pas vanaf twee kwalificerende kinderen op 1 januari van het aanslagjaar.",
      );
    }

    if (input.invaliditeit === true) {
      reductionsApplied.push(
        maakReductieLijn(
          "1 kwalificerende persoon met handicap",
          yearParameters.handicapBaseAmountPerPerson,
          municipality.provincialeOpcentiemen,
          municipality.gemeentelijkeOpcentiemen,
        ),
      );
      addIssue(
        issues,
        "info",
        "ov_handicap_input_beperkt",
        "De huidige input laat alleen ja/nee toe voor handicap. Voor meerdere kwalificerende personen moet dit veld later uitgebreid worden.",
      );
    }

    if (input.eigenaarOuderDan70 === true) {
      addIssue(
        issues,
        "warning",
        "ov_geen_algemene_70plus_vermindering",
        "Er werd geen algemene Vlaamse 70+-vermindering toegepast, omdat die niet als actuele algemene vermindering bevestigd werd op de officiele VLABEL-pagina's.",
      );
    }
  } else if (
    (input.kinderenTenLaste ?? 0) > 0 ||
    input.invaliditeit === true ||
    input.eigenaarOuderDan70 === true
  ) {
    addIssue(
      issues,
      "info",
      "ov_verminderingen_enkel_eigen_woning",
      "De ingevoerde verminderingen zijn niet toegepast omdat ze alleen relevant zijn voor de eigen gezinswoning van de eigenaar.",
    );
  }

  const reductionAmount = roundMoney(
    reductionsApplied.reduce((sum, item) => sum + item.totalAmount, 0),
  );
  const totalDue = roundMoney(
    Math.max(0, brutoOnroerendeVoorheffing - reductionAmount),
  );

  return {
    status: issues.some((issue) => issue.level === "missing") ? "partial" : "complete",
    aanslagjaar,
    indexatiecoefficient: yearParameters.indexatiecoefficient,
    basisheffingRate: VLAAMSE_BASISHEFFING,
    gemeente: municipality.gemeenteNaam,
    gemeenteNisCode: municipality.nisCode,
    geindexeerdKI,
    basisheffingAmount,
    provincialeOpcentiemen: municipality.provincialeOpcentiemen,
    provincialeAmount,
    gemeentelijkeOpcentiemen: municipality.gemeentelijkeOpcentiemen,
    gemeentelijkeAmount,
    brutoOnroerendeVoorheffing,
    reductionAmount: reductionAmount || undefined,
    totalDue,
    reductionsApplied,
    assumptions,
    issues,
    sources: VERIFIED_SOURCES,
  };
}
