import { z } from "zod";

const confidenceSchema = z.enum(["high", "medium", "low", "none"]);

const textFieldSchema = z.object({
  value: z.string().trim().min(1).max(200).nullable(),
  confidence: confidenceSchema,
  evidence: z.string().trim().max(280).nullable().optional(),
});

const numberFieldSchema = z.object({
  value: z.number().finite().nonnegative().nullable(),
  confidence: confidenceSchema,
  evidence: z.string().trim().max(280).nullable().optional(),
});

const integerFieldSchema = z.object({
  value: z.number().int().nonnegative().nullable(),
  confidence: confidenceSchema,
  evidence: z.string().trim().max(280).nullable().optional(),
});

export const singleImageExtractionSchema = z.object({
  imageIndex: z.number().int().nonnegative(),
  prijs: numberFieldSchema,
  postcode: textFieldSchema,
  gemeente: textFieldSchema,
  pandtype: textFieldSchema,
  oppervlakte: numberFieldSchema,
  bouwjaar: integerFieldSchema,
  nietGeindexeerdKi: numberFieldSchema,
  epcLabel: textFieldSchema,
  aantalSlaapkamers: integerFieldSchema,
  opmerkingen: z.string().trim().max(500).nullable().optional(),
});

export type SingleImageExtraction = z.infer<typeof singleImageExtractionSchema>;
export type ExtractionFieldName = Exclude<
  keyof SingleImageExtraction,
  "imageIndex" | "opmerkingen"
>;
export type ExtractionConfidence = z.infer<typeof confidenceSchema>;

export const EXTRACTION_FIELD_NAMES: ExtractionFieldName[] = [
  "prijs",
  "postcode",
  "gemeente",
  "pandtype",
  "oppervlakte",
  "bouwjaar",
  "nietGeindexeerdKi",
  "epcLabel",
  "aantalSlaapkamers",
];

export function parseSingleImageExtraction(value: unknown): SingleImageExtraction {
  return singleImageExtractionSchema.parse(value);
}

export const CLAUDE_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "imageIndex",
    "prijs",
    "postcode",
    "gemeente",
    "pandtype",
    "oppervlakte",
    "bouwjaar",
    "nietGeindexeerdKi",
    "epcLabel",
    "aantalSlaapkamers",
  ],
  properties: {
    imageIndex: {
      type: "integer",
      minimum: 0,
    },
    prijs: structuredFieldSchema("number"),
    postcode: structuredFieldSchema("string"),
    gemeente: structuredFieldSchema("string"),
    pandtype: structuredFieldSchema("string"),
    oppervlakte: structuredFieldSchema("number"),
    bouwjaar: structuredFieldSchema("integer"),
    nietGeindexeerdKi: structuredFieldSchema("number"),
    epcLabel: structuredFieldSchema("string"),
    aantalSlaapkamers: structuredFieldSchema("integer"),
    opmerkingen: {
      type: ["string", "null"],
      maxLength: 500,
    },
  },
} as const;

function structuredFieldSchema(type: "string" | "number" | "integer") {
  return {
    type: "object",
    additionalProperties: false,
    required: ["value", "confidence", "evidence"],
    properties: {
      value:
        type === "string"
          ? { type: ["string", "null"], maxLength: 200 }
          : type === "integer"
            ? { type: ["integer", "null"], minimum: 0 }
            : { type: ["number", "null"], minimum: 0 },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low", "none"],
      },
      evidence: {
        type: ["string", "null"],
        maxLength: 280,
      },
    },
  } as const;
}
