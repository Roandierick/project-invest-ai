import { describe, expect, it } from "vitest";

import { emptyForm } from "@/lib/analysis/form";
import type { BaselineAnalysisResult } from "@/lib/analysis/types";
import {
  applyFormUpdates,
  executeChatTool,
  mergeToolOutputIntoAnalysisResult,
} from "@/lib/assistant/chat-tools";

describe("chat tools", () => {
  it("werkt de gestructureerde formulierstaat bij via update_analysis_form", () => {
    const form = emptyForm();
    const { nextForm, appliedPatch } = applyFormUpdates(form, [
      { field: "aankoopprijs", value: "285000" },
      { field: "gemeente", value: "Gent" },
      { field: "maandelijkseHuur", value: "1150" },
    ]);

    expect(appliedPatch).toEqual({
      aankoopprijs: "285000",
      gemeente: "Gent",
      maandelijkseHuur: "1150",
    });
    expect(nextForm.aankoopprijs).toBe("285000");
    expect(nextForm.gemeente).toBe("Gent");
    expect(nextForm.maandelijkseHuur).toBe("1150");
  });

  it("kan na een tool-update een volledige basisanalyse draaien op de actuele formulierstaat", () => {
    const updatedState = executeChatTool(
      "update_analysis_form",
      {
        updates: [
          { field: "aankoopprijs", value: "250000" },
          { field: "gewest", value: "vlaanderen" },
          { field: "aankoopSituatie", value: "investering_of_tweede" },
          { field: "gemeenteNisCode", value: "41002" },
          { field: "nietGeindexeerdKi", value: "900" },
          { field: "maandelijkseHuur", value: "1100" },
          { field: "geleendBedrag", value: "200000" },
          { field: "jaarlijkseRente", value: "3,5" },
          { field: "looptijdJaren", value: "20" },
          { field: "leningType", value: "vast" },
        ],
      },
      { workingForm: emptyForm() },
    );

    const calculation = executeChatTool(
      "calculate_basisanalyse",
      {},
      updatedState.nextState,
    );

    const result = calculation.output as {
      status: string;
      module3: {
        status: string;
        bar?: number;
      };
      module4: {
        status: string;
        maandlast?: number;
      };
    };

    expect(updatedState.formWasUpdated).toBe(true);
    expect(updatedState.calculationWasRun).toBe(false);
    expect(calculation.calculationWasRun).toBe(true);
    expect(result.module3.status).toBe("complete");
    expect(result.module3.bar).toBeCloseTo(4.64, 2);
    expect(result.module4.status).toBe("complete");
    expect(result.module4.maandlast).toBeCloseTo(1159.92, 2);
    expect(["partial", "complete"]).toContain(result.status);
  });

  it("laat een negatieve hefboom-warning via de chatroute-merge in het analyse-resultaat landen", () => {
    const updatedState = executeChatTool(
      "update_analysis_form",
      {
        updates: [
          { field: "aankoopprijs", value: "250000" },
          { field: "gewest", value: "vlaanderen" },
          { field: "aankoopSituatie", value: "investering_of_tweede" },
          { field: "gemeenteNisCode", value: "41002" },
          { field: "nietGeindexeerdKi", value: "900" },
          { field: "maandelijkseHuur", value: "1100" },
          { field: "geleendBedrag", value: "220000" },
          { field: "jaarlijkseRente", value: "3,5" },
          { field: "looptijdJaren", value: "20" },
          { field: "leningType", value: "vast" },
          { field: "eigenInbreng", value: "80000" },
        ],
      },
      { workingForm: emptyForm() },
    );

    const basis = executeChatTool(
      "calculate_basisanalyse",
      {},
      updatedState.nextState,
    );
    const hefboom = executeChatTool(
      "calculate_module_5",
      {},
      updatedState.nextState,
    );

    const merged = mergeToolOutputIntoAnalysisResult({
      toolName: "calculate_module_5",
      output: hefboom.output,
      workingForm: updatedState.nextState.workingForm,
      previousResult: basis.output as BaselineAnalysisResult,
    });

    expect(merged.module5?.hefboomIsPositief).toBe(false);
    expect(
      merged.module5?.issues.some((issue) => issue.code === "hefboom_negatief"),
    ).toBe(true);
    expect(
      merged.issues.some((issue) => issue.code === "hefboom_negatief"),
    ).toBe(true);
  });
});
