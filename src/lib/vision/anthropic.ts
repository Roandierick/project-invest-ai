import {
  getAnthropicApiKey,
  getAnthropicModel,
} from "@/lib/supabase/env";
import {
  CLAUDE_EXTRACTION_JSON_SCHEMA,
  parseSingleImageExtraction,
  type SingleImageExtraction,
} from "@/lib/vision/schema";

interface ExtractImageInput {
  imageIndex: number;
  base64Data: string;
  mediaType: string;
}

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicMessagesResponse {
  content?: AnthropicTextBlock[];
  error?: {
    message?: string;
  };
}

const SYSTEM_PROMPT = `Je bent een extractiemodel voor Belgische vastgoedadvertenties.
Lees alleen gegevens die echt zichtbaar zijn op de aangeleverde afbeelding.
Bereken niets, vul niets in op basis van aannames en laat onduidelijke velden leeg.
Geef per veld een confidence: high, medium, low of none.
Gebruik voor ontbrekende of onleesbare waarden altijd null en confidence "none".
Hou evidence kort en feitelijk.`;

export async function extractListingFromImage(
  input: ExtractImageInput,
): Promise<SingleImageExtraction> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: getAnthropicModel(),
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extraheer alleen zichtbare vastgoedgegevens uit afbeelding ${input.imageIndex}. Zet imageIndex exact op ${input.imageIndex}.`,
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.mediaType,
                data: input.base64Data,
              },
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          name: "listing_extraction",
          schema: CLAUDE_EXTRACTION_JSON_SCHEMA,
        },
      },
    }),
  });

  const payload = (await response.json()) as AnthropicMessagesResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || "Claude extraction request failed.",
    );
  }

  const text = payload.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new Error("Claude did not return a structured text payload.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
  }

  return parseSingleImageExtraction(parsed);
}
