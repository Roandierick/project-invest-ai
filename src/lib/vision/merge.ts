import type { AnalysisFormState } from "@/lib/analysis/types";
import {
  EXTRACTION_FIELD_NAMES,
  type ExtractionConfidence,
  type ExtractionFieldName,
  type SingleImageExtraction,
} from "@/lib/vision/schema";

type ReviewFormKey =
  | "aankoopprijs"
  | "postcode"
  | "gemeente"
  | "pandtype"
  | "oppervlakte"
  | "bouwjaar"
  | "nietGeindexeerdKi"
  | "epcLabel"
  | "aantalSlaapkamers";

export interface ExtractionCandidate {
  imageIndex: number;
  rawValue: string;
  normalizedValue: string;
  confidence: ExtractionConfidence;
  evidence: string | null;
}

export interface MergedFieldResult {
  field: ExtractionFieldName;
  suggestedValue: string;
  confidence: ExtractionConfidence;
  hasConflict: boolean;
  candidates: ExtractionCandidate[];
}

export interface ExtractionConflict {
  field: ExtractionFieldName;
  values: string[];
  imageIndexes: number[];
}

export interface MergedListingExtraction {
  suggestedFormPatch: Partial<AnalysisFormState>;
  fields: Record<ExtractionFieldName, MergedFieldResult>;
  conflicts: ExtractionConflict[];
}

const CONFIDENCE_SCORE: Record<ExtractionConfidence, number> = {
  high: 4,
  medium: 3,
  low: 2,
  none: 1,
};

function normalizeValue(field: ExtractionFieldName, value: string): string {
  const trimmed = value.trim();

  if (field === "epcLabel") {
    return trimmed.toUpperCase();
  }

  if (field === "postcode") {
    return trimmed.replace(/\s+/g, "");
  }

  return trimmed.replace(/\s+/g, " ").toLowerCase();
}

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value);
  }

  return typeof value === "string" ? value.trim() : "";
}

function mapFieldToFormKey(
  field: ExtractionFieldName,
): ReviewFormKey {
  switch (field) {
    case "prijs":
      return "aankoopprijs";
    case "postcode":
      return "postcode";
    case "gemeente":
      return "gemeente";
    case "pandtype":
      return "pandtype";
    case "oppervlakte":
      return "oppervlakte";
    case "bouwjaar":
      return "bouwjaar";
    case "nietGeindexeerdKi":
      return "nietGeindexeerdKi";
    case "epcLabel":
      return "epcLabel";
    case "aantalSlaapkamers":
      return "aantalSlaapkamers";
  }
}

function buildCandidates(
  extractions: SingleImageExtraction[],
  field: ExtractionFieldName,
): ExtractionCandidate[] {
  return extractions
    .map((extraction) => {
      const value = extraction[field].value;
      const rawValue = formatValue(value);

      if (!rawValue) {
        return null;
      }

      return {
        imageIndex: extraction.imageIndex,
        rawValue,
        normalizedValue: normalizeValue(field, rawValue),
        confidence: extraction[field].confidence,
        evidence: extraction[field].evidence ?? null,
      };
    })
    .filter((candidate): candidate is ExtractionCandidate => candidate !== null)
    .sort((left, right) => {
      const scoreDiff =
        CONFIDENCE_SCORE[right.confidence] - CONFIDENCE_SCORE[left.confidence];

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.imageIndex - right.imageIndex;
    });
}

export function mergeImageExtractions(
  extractions: SingleImageExtraction[],
): MergedListingExtraction {
  const suggestedFormPatch: Partial<Record<ReviewFormKey, string>> = {};
  const conflicts: ExtractionConflict[] = [];
  const fields = {} as Record<ExtractionFieldName, MergedFieldResult>;

  for (const field of EXTRACTION_FIELD_NAMES) {
    const candidates = buildCandidates(extractions, field);
    const uniqueValues = Array.from(
      new Set(candidates.map((candidate) => candidate.normalizedValue)),
    );
    const suggested = candidates[0];

    if (suggested) {
      suggestedFormPatch[mapFieldToFormKey(field)] = suggested.rawValue;
    }

    fields[field] = {
      field,
      suggestedValue: suggested?.rawValue ?? "",
      confidence: suggested?.confidence ?? "none",
      hasConflict: uniqueValues.length > 1,
      candidates,
    };

    if (uniqueValues.length > 1) {
      conflicts.push({
        field,
        values: Array.from(new Set(candidates.map((candidate) => candidate.rawValue))),
        imageIndexes: Array.from(
          new Set(candidates.map((candidate) => candidate.imageIndex)),
        ),
      });
    }
  }

  return {
    suggestedFormPatch: suggestedFormPatch as Partial<AnalysisFormState>,
    fields,
    conflicts,
  };
}
