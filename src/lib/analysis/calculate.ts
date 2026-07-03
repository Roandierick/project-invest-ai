import {
  berekenAankoopKostenModule1,
  berekenOnroerendeVoorheffingVlaanderen,
  berekenRendement,
  berekenLening,
} from "@/lib/calc-engine";
import {
  toModule1Input,
  toModule2Input,
  toModule3Input,
  toModule4Input,
} from "@/lib/analysis/form";
import type {
  AnalysisFormState,
  BaselineAnalysisResult,
} from "@/lib/analysis/types";

function uniqueSources<T extends { url: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.url, item])).values());
}

export function berekenBasisAnalyse(
  form: AnalysisFormState,
): BaselineAnalysisResult {
  const module1 = berekenAankoopKostenModule1(toModule1Input(form));
  const module2 = berekenOnroerendeVoorheffingVlaanderen(toModule2Input(form));
  const module4 = berekenLening(toModule4Input(form));
  const module3 = berekenRendement(
    toModule3Input(form, {
      aankoopkosten:
        module1.totalExtraCostsWithEstimate ?? module1.totalExtraCostsKnown,
      jaarlijkseOV: module2.totalDue,
      jaarlijkseFinancieringslastenFallback: module4.eersteJaarInterest,
    }),
  );
  const issues = [
    ...module1.issues,
    ...module2.issues,
    ...module3.issues,
    ...module4.issues,
  ];
  const sources = uniqueSources([
    ...module1.sources,
    ...module2.sources,
    ...module3.sources,
    ...module4.sources,
  ]);

  return {
    status:
      module1.status === "complete" &&
      module2.status === "complete" &&
      module3.status === "complete" &&
      module4.status === "complete"
        ? "complete"
        : "partial",
    module1,
    module2,
    module3,
    module4,
    issues,
    sources,
  };
}
