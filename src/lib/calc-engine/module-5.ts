import type {
  CalculationIssue,
  HefboomInput,
  Module5Result,
  SourceReference,
} from "@/lib/calc-engine/types";

const VERIFIED_SOURCES: SourceReference[] = [
  {
    label: "Universite Numerique - cours de finance d'entreprise, effet de levier",
    url: "https://moodle.luniversitenumerique.fr/pluginfile.php/57798/mod_folder/content/0/introduction-a-la-finance-d-entreprise-chap-4-lecon-4-cours-final.pdf",
    verifiedAt: "2026-07-01",
  },
  {
    label: "La finance pour tous - effet de levier",
    url: "https://www.lafinancepourtous.com/decryptages/entreprise/gestion-et-comptabilite/analyse-financiere/leffet-de-levier/",
    verifiedAt: "2026-07-01",
  },
];

function roundDecimal(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function addIssue(
  list: CalculationIssue[],
  level: CalculationIssue["level"],
  code: string,
  message: string,
) {
  list.push({ level, code, message });
}

export function berekenHefboomeffect(
  input: HefboomInput,
): Module5Result {
  const assumptions: string[] = [];
  const issues: CalculationIssue[] = [];

  if (input.rtv === undefined) {
    addIssue(
      issues,
      "missing",
      "hefboom_rtv_verplicht",
      "De hefboom kan pas berekend worden zodra het netto aanvangsrendement (NAR) beschikbaar is.",
    );
  }

  if (input.rvv === undefined) {
    addIssue(
      issues,
      "missing",
      "hefboom_rvv_verplicht",
      "De hefboom kan pas berekend worden zodra de rentevoet van het vreemd vermogen beschikbaar is.",
    );
  }

  if (input.vreemdVermogen === undefined || input.vreemdVermogen <= 0) {
    addIssue(
      issues,
      "missing",
      "hefboom_vreemd_vermogen_verplicht",
      "Geef een positief bedrag aan vreemd vermogen op om het hefboomeffect te berekenen.",
    );
  }

  if (input.eigenVermogen === undefined || input.eigenVermogen <= 0) {
    addIssue(
      issues,
      "missing",
      "hefboom_eigen_vermogen_verplicht",
      "Geef een positief bedrag aan eigen vermogen op om het hefboomeffect te berekenen.",
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

  const verhoudingVreemdOpEigenVermogen = roundDecimal(
    (input.vreemdVermogen ?? 0) / (input.eigenVermogen ?? 1),
  );
  const rev = roundDecimal(
    (input.rtv ?? 0) +
      ((input.rtv ?? 0) - (input.rvv ?? 0)) * verhoudingVreemdOpEigenVermogen,
  );
  const hefboomIsPositief = (input.rtv ?? 0) > (input.rvv ?? 0);
  const verschilMetRtv = roundDecimal(rev - (input.rtv ?? 0));

  assumptions.push(
    "RTV, RVV en REV worden hier als decimalen berekend. Een getoonde waarde van 0,0345 komt dus overeen met 3,45%.",
  );

  if (!hefboomIsPositief) {
    addIssue(
      issues,
      "warning",
      "hefboom_negatief",
      "De hefboom is negatief: de rente op het vreemd vermogen ligt hoger dan het rendement op het totaal vermogen, waardoor lenen het rendement op eigen vermogen verlaagt.",
    );
  }

  return {
    status: "complete",
    rtv: roundDecimal(input.rtv ?? 0),
    rvv: roundDecimal(input.rvv ?? 0),
    vreemdVermogen: input.vreemdVermogen,
    eigenVermogen: input.eigenVermogen,
    verhoudingVreemdOpEigenVermogen,
    rev,
    hefboomIsPositief,
    verschilMetRtv,
    assumptions,
    issues,
    sources: VERIFIED_SOURCES,
  };
}
