import {
  berekenAankoopKostenModule1,
  berekenErfbelasting,
  berekenHefboomeffect,
  berekenLening,
  berekenOnroerendeVoorheffingVlaanderen,
  berekenRendement,
} from "@/lib/calc-engine";
import { berekenBasisAnalyse } from "@/lib/analysis/calculate";
import {
  mergeFormPatch,
  toModule1Input,
  toModule2Input,
  toModule3Input,
  toModule4Input,
  toModule5Input,
  toModule6Input,
} from "@/lib/analysis/form";
import type {
  AnalysisFormState,
  BaselineAnalysisResult,
} from "@/lib/analysis/types";
import type { Module5Result, Module6Result } from "@/lib/calc-engine";
import type { EnrichmentContext } from "@/lib/enrichment/types";

export const ANALYSIS_FORM_FIELDS = [
  "aankoopprijs",
  "postcode",
  "gemeente",
  "gemeenteNisCode",
  "pandtype",
  "oppervlakte",
  "bouwjaar",
  "nietGeindexeerdKi",
  "epcLabel",
  "aantalSlaapkamers",
  "maandelijkseHuur",
  "onderhoudsPercentage",
  "leegstandMaanden",
  "verzekeringJaarlijks",
  "syndicusVmeJaarlijks",
  "beheerkostenJaarlijks",
  "eigenInbreng",
  "jaarlijkseFinancieringslasten",
  "geleendBedrag",
  "jaarlijkseRente",
  "looptijdJaren",
  "leningType",
  "nettoMaandinkomen",
  "alleenstaand",
  "gewest",
  "aankoopSituatie",
  "compromisDatum",
  "authentiekeAkteDatum",
  "kopersZijnUitsluitendNatuurlijkePersonen",
  "verwervingInVolleEigendom",
  "heeftAndereWoningInVolleEigendom",
  "verkooptAndereWoningBinnenTolerantie",
  "ligtInKernstadOfVlaamseRand",
  "geschatteUitgavenAanDerdenExclBtw",
  "isEigenWoningVanEigenaar",
  "kinderenTenLaste",
  "invaliditeit",
  "eigenaarOuderDan70",
  "erfbelastingOnroerendAandeel",
  "erfbelastingRoerendAandeel",
  "erfbelastingGroepsTotaal",
  "erfbelastingVerwantschap",
  "erfbelastingGewest",
  "erfbelastingIsLangstlevendePartner",
  "erfbelastingIsGezinswoning",
  "notes",
] as const satisfies readonly (keyof AnalysisFormState)[];

export type AnalysisFormField = (typeof ANALYSIS_FORM_FIELDS)[number];

export interface FormUpdate {
  field: AnalysisFormField;
  value: string;
}

export interface ToolExecutionState {
  workingForm: AnalysisFormState;
}

export interface ToolExecutionResult {
  output: unknown;
  nextState: ToolExecutionState;
  formWasUpdated: boolean;
  calculationWasRun: boolean;
}

function isAnalysisFormField(value: string): value is AnalysisFormField {
  return ANALYSIS_FORM_FIELDS.includes(value as AnalysisFormField);
}

export function applyFormUpdates(
  form: AnalysisFormState,
  updates: FormUpdate[],
): {
  nextForm: AnalysisFormState;
  appliedPatch: Partial<AnalysisFormState>;
} {
  const patch: Partial<AnalysisFormState> = {};
  const writablePatch = patch as Record<
    AnalysisFormField,
    AnalysisFormState[AnalysisFormField]
  >;

  for (const update of updates) {
    if (!isAnalysisFormField(update.field)) {
      throw new Error(`Onbekend analyseveld in tool-call: ${update.field}`);
    }

    writablePatch[update.field] = update.value as never;
  }

  return {
    nextForm: mergeFormPatch(form, patch),
    appliedPatch: patch,
  };
}

function calculateModule3FromForm(form: AnalysisFormState) {
  const basis = berekenBasisAnalyse(form);

  return {
    module3: basis.module3,
    module1: basis.module1,
    module2: basis.module2,
  };
}

function calculateModule4FromForm(form: AnalysisFormState) {
  const basis = berekenBasisAnalyse(form);

  return {
    module4: basis.module4,
    module1: basis.module1,
  };
}

function calculateModule5FromForm(form: AnalysisFormState) {
  const basis = berekenBasisAnalyse(form);
  const module5 = berekenHefboomeffect(
    toModule5Input(form, {
      narPercentage: basis.module3.nar,
    }),
  );

  return {
    module5,
    module3: basis.module3,
    module4: basis.module4,
  };
}

function calculateModule6FromForm(form: AnalysisFormState) {
  return berekenErfbelasting(toModule6Input(form));
}

function uniqueSources<T extends { url: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.url, item])).values());
}

export function composeConversationAnalysisResult(
  baseResult: BaselineAnalysisResult,
  extras?: {
    module5?: Module5Result;
    module6?: Module6Result;
  },
): BaselineAnalysisResult {
  const next: BaselineAnalysisResult = {
    ...baseResult,
    ...(extras?.module5 ? { module5: extras.module5 } : {}),
    ...(extras?.module6 ? { module6: extras.module6 } : {}),
  };

  const issues = [
    ...next.module1.issues,
    ...next.module2.issues,
    ...next.module3.issues,
    ...next.module4.issues,
    ...(next.module5?.issues ?? []),
    ...(next.module6?.issues ?? []),
  ];
  const sources = uniqueSources([
    ...next.module1.sources,
    ...next.module2.sources,
    ...next.module3.sources,
    ...next.module4.sources,
    ...(next.module5?.sources ?? []),
    ...(next.module6?.sources ?? []),
  ]);
  const optionalModules = [next.module5, next.module6].filter(
    (module): module is Module5Result | Module6Result => module !== undefined,
  );
  const optionalModulesComplete = optionalModules.every(
    (module) => module.status === "complete",
  );

  return {
    ...next,
    status:
      next.module1.status === "complete" &&
      next.module2.status === "complete" &&
      next.module3.status === "complete" &&
      next.module4.status === "complete" &&
      optionalModulesComplete
        ? "complete"
        : "partial",
    issues,
    sources,
  };
}

export function mergeToolOutputIntoAnalysisResult(args: {
  toolName: string;
  output: unknown;
  workingForm: AnalysisFormState;
  previousResult: BaselineAnalysisResult;
}): BaselineAnalysisResult {
  const baseResult = berekenBasisAnalyse(args.workingForm);

  if (args.toolName === "calculate_module_5") {
    const payload = args.output as {
      module5: NonNullable<BaselineAnalysisResult["module5"]>;
    };

    return composeConversationAnalysisResult(baseResult, {
      module5: payload.module5,
      module6: args.previousResult.module6,
    });
  }

  if (args.toolName === "calculate_module_6") {
    return composeConversationAnalysisResult(baseResult, {
      module5: args.previousResult.module5,
      module6: args.output as NonNullable<BaselineAnalysisResult["module6"]>,
    });
  }

  if (args.toolName === "calculate_basisanalyse") {
    return args.output as BaselineAnalysisResult;
  }

  return composeConversationAnalysisResult(baseResult, {
    module5: args.previousResult.module5,
    module6: args.previousResult.module6,
  });
}

export function buildStateEnvelope(
  form: AnalysisFormState,
  latestResult: BaselineAnalysisResult | null,
  enrichmentContext?: EnrichmentContext | null,
) {
  return {
    currentForm: form,
    latestCalculatedResult: latestResult,
    enrichmentContext: enrichmentContext ?? null,
  };
}

export const CHAT_TOOL_DEFINITIONS = [
  {
    name: "update_analysis_form",
    description:
      "Werk de gestructureerde pand- en financieringsvelden bij op basis van nieuwe input van de gebruiker. Gebruik lege string om een veld bewust leeg te maken.",
    input_schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              field: {
                type: "string",
                enum: [...ANALYSIS_FORM_FIELDS],
              },
              value: {
                type: "string",
                description:
                  "Bewaar de ruwe formulierwaarde als string. Gebruik percentages zoals gebruikers ze geven, bijvoorbeeld '3,5' of '1,25'.",
              },
            },
            required: ["field", "value"],
            additionalProperties: false,
          },
        },
        note: {
          type: "string",
        },
      },
      required: ["updates"],
      additionalProperties: false,
    },
  },
  {
    name: "calculate_module_1",
    description:
      "Bereken registratiebelasting, aankoopaktekosten en totaal projectbudget op basis van de actuele formulierstaat.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "calculate_module_2",
    description:
      "Bereken de Vlaamse onroerende voorheffing op basis van de actuele formulierstaat.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "calculate_module_3",
    description:
      "Bereken BAR, NAR en cash-on-cash rendement op basis van de actuele formulierstaat.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "calculate_module_4",
    description:
      "Bereken maandlast, totale interest, quotiteitscheck en optionele DSTI-check voor de lening.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "calculate_basisanalyse",
    description:
      "Bereken de volledige basisanalyse met modules 1 tot en met 4 op basis van de actuele formulierstaat.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "calculate_module_5",
    description:
      "Bereken het hefboomeffect op basis van NAR, rentevoet, vreemd vermogen en eigen vermogen uit de actuele dossierstaat.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "calculate_module_6",
    description:
      "Bereken de erfbelasting op basis van het actuele erfenisscenario in de dossierstaat.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string" },
      },
      additionalProperties: false,
    },
  },
] as const;

export function executeChatTool(
  name: string,
  rawInput: unknown,
  state: ToolExecutionState,
): ToolExecutionResult {
  if (name === "update_analysis_form") {
    const input = rawInput as {
      updates?: FormUpdate[];
      note?: string;
    };

    if (!Array.isArray(input.updates) || input.updates.length === 0) {
      throw new Error("update_analysis_form verwacht minstens een update.");
    }

    const { nextForm, appliedPatch } = applyFormUpdates(
      state.workingForm,
      input.updates,
    );

    return {
      output: {
        appliedPatch,
        currentForm: nextForm,
        note: input.note ?? null,
      },
      nextState: {
        workingForm: nextForm,
      },
      formWasUpdated: true,
      calculationWasRun: false,
    };
  }

  if (name === "calculate_module_1") {
    return {
      output: berekenAankoopKostenModule1(toModule1Input(state.workingForm)),
      nextState: state,
      formWasUpdated: false,
      calculationWasRun: true,
    };
  }

  if (name === "calculate_module_2") {
    return {
      output: berekenOnroerendeVoorheffingVlaanderen(
        toModule2Input(state.workingForm),
      ),
      nextState: state,
      formWasUpdated: false,
      calculationWasRun: true,
    };
  }

  if (name === "calculate_module_3") {
    return {
      output: calculateModule3FromForm(state.workingForm),
      nextState: state,
      formWasUpdated: false,
      calculationWasRun: true,
    };
  }

  if (name === "calculate_module_4") {
    return {
      output: calculateModule4FromForm(state.workingForm),
      nextState: state,
      formWasUpdated: false,
      calculationWasRun: true,
    };
  }

  if (name === "calculate_basisanalyse") {
    return {
      output: berekenBasisAnalyse(state.workingForm),
      nextState: state,
      formWasUpdated: false,
      calculationWasRun: true,
    };
  }

  if (name === "calculate_module_5") {
    return {
      output: calculateModule5FromForm(state.workingForm),
      nextState: state,
      formWasUpdated: false,
      calculationWasRun: true,
    };
  }

  if (name === "calculate_module_6") {
    return {
      output: calculateModule6FromForm(state.workingForm),
      nextState: state,
      formWasUpdated: false,
      calculationWasRun: true,
    };
  }

  throw new Error(`Onbekende chattool: ${name}`);
}

export function calculateRendementDirect(form: AnalysisFormState) {
  const module1 = berekenAankoopKostenModule1(toModule1Input(form));
  const module2 = berekenOnroerendeVoorheffingVlaanderen(toModule2Input(form));
  const module4 = berekenLening(toModule4Input(form));

  return berekenRendement(
    toModule3Input(form, {
      aankoopkosten:
        module1.totalExtraCostsWithEstimate ?? module1.totalExtraCostsKnown,
      jaarlijkseOV: module2.totalDue,
      jaarlijkseFinancieringslastenFallback: module4.eersteJaarInterest,
    }),
  );
}
