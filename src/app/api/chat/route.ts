import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ANALYSIS_FORM_FIELDS,
  CHAT_TOOL_DEFINITIONS,
  buildStateEnvelope,
  executeChatTool,
  mergeToolOutputIntoAnalysisResult,
} from "@/lib/assistant/chat-tools";
import {
  buildFinalSystemPrompt,
  buildPlanningSystemPrompt,
} from "@/lib/assistant/chat-prompts";
import { persistConversationTurn } from "@/lib/assistant/persist-turn";
import { berekenBasisAnalyse } from "@/lib/analysis/calculate";
import { emptyForm } from "@/lib/analysis/form";
import type { AnalysisFormState } from "@/lib/analysis/types";
import { getConversationDetails } from "@/lib/conversations/repository";
import { resolveEnrichmentContext } from "@/lib/enrichment/context";
import {
  getAnthropicApiKey,
  getAnthropicModel,
  hasAnthropicApiKey,
} from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_TOOL_ROUNDS = 6;

const ChatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  userMessage: z.string().trim().min(1),
  form: z.record(z.string(), z.string()).optional(),
  uploadedStoragePaths: z.array(z.string().trim().min(1)).max(5).optional(),
});

type AnthropicRole = "user" | "assistant";

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};

type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

type AnthropicMessage = {
  role: AnthropicRole;
  content: string | AnthropicContentBlock[];
};

type AnthropicResponse = {
  content?: AnthropicContentBlock[];
  error?: {
    message?: string;
  };
};

function sanitizeIncomingForm(
  incoming: Record<string, string> | undefined,
  fallback: AnalysisFormState,
): AnalysisFormState {
  if (!incoming) {
    return fallback;
  }

  const next = { ...fallback };
  const writableNext = next as Record<
    (typeof ANALYSIS_FORM_FIELDS)[number],
    AnalysisFormState[(typeof ANALYSIS_FORM_FIELDS)[number]]
  >;

  for (const field of ANALYSIS_FORM_FIELDS) {
    const candidate = incoming[field];

    if (typeof candidate === "string") {
      writableNext[field] = candidate as never;
    }
  }

  return next;
}

function mapConversationMessagesToAnthropic(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): AnthropicMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function formsMatch(
  left: AnalysisFormState,
  right: AnalysisFormState,
): boolean {
  return ANALYSIS_FORM_FIELDS.every((field) => left[field] === right[field]);
}

function extractToolUseBlocks(
  content: AnthropicContentBlock[] | undefined,
): AnthropicToolUseBlock[] {
  return (content ?? []).filter(
    (block): block is AnthropicToolUseBlock => block.type === "tool_use",
  );
}

async function callAnthropicMessage(args: {
  system: string;
  messages: AnthropicMessage[];
  tools?: readonly unknown[];
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: getAnthropicModel(),
      max_tokens: 1400,
      temperature: 0.1,
      system: args.system,
      messages: args.messages,
      tools: args.tools,
    }),
  });

  const payload = (await response.json()) as AnthropicResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || "Claude tool-planning request failed.",
    );
  }

  return payload;
}

async function streamAnthropicFinalMessage(args: {
  system: string;
  messages: AnthropicMessage[];
  onText: (chunk: string) => void;
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: getAnthropicModel(),
      max_tokens: 1800,
      temperature: 0.25,
      system: args.system,
      messages: args.messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as AnthropicResponse;

    throw new Error(
      payload.error?.message || "Claude streaming response failed.",
    );
  }

  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("Claude stream returned no readable body.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let sawText = false;

  function handleEventBlock(block: string) {
    const lines = block.split(/\r?\n/);
    let eventName = "message";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice("data:".length).trim();
      }
    }

    if (!data || data === "[DONE]") {
      return;
    }

    const parsed = JSON.parse(data) as {
      delta?: {
        type?: string;
        text?: string;
      };
      error?: {
        message?: string;
      };
    };

    if (eventName === "error") {
      throw new Error(parsed.error?.message || "Claude stream error.");
    }

    if (
      eventName === "content_block_delta" &&
      parsed.delta?.type === "text_delta" &&
      typeof parsed.delta.text === "string"
    ) {
      sawText = true;
      args.onText(parsed.delta.text);
    }
  }

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundaryIndex = buffer.indexOf("\n\n");

    while (boundaryIndex >= 0) {
      const block = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      if (block.trim()) {
        handleEventBlock(block);
      }

      boundaryIndex = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    handleEventBlock(buffer);
  }

  if (!sawText) {
    throw new Error("Claude stream ended without text output.");
  }
}

export async function POST(request: Request) {
  if (!hasAnthropicApiKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 503 },
    );
  }

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Je moet ingelogd zijn om deze chat te gebruiken." },
        { status: 401 },
      );
    }

    const rawPayload = await request.json();
    const payload = ChatRequestSchema.parse(rawPayload);
    const conversation = await getConversationDetails(
      supabase,
      payload.conversationId,
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Gesprek niet gevonden." },
        { status: 404 },
      );
    }

    const initialForm = sanitizeIncomingForm(
      payload.form,
      conversation.currentForm ?? emptyForm(),
    );
    const initialEnrichmentContext = await resolveEnrichmentContext({
      form: initialForm,
      storedForm: conversation.currentForm,
      storedEnrichmentContext: conversation.currentEnrichmentContext,
    });
    const storedResultIsReusable =
      conversation.latestResult !== null &&
      formsMatch(initialForm, conversation.currentForm);
    const initialResult =
      storedResultIsReusable && conversation.latestResult
        ? conversation.latestResult
        : berekenBasisAnalyse(initialForm);
    const planningMessages = mapConversationMessagesToAnthropic(
      conversation.messages,
    );

    planningMessages.push({
      role: "user",
      content: payload.userMessage,
    });

    let workingForm = initialForm;
    let workingEnrichmentContext = initialEnrichmentContext;
    let latestResult = initialResult;
    let formWasUpdated = false;
    let calculationWasRun = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const planningResponse = await callAnthropicMessage({
        system: buildPlanningSystemPrompt({
          form: workingForm,
          latestResult,
          enrichmentContext: workingEnrichmentContext,
          isOpeningTurn: conversation.messages.length === 0,
        }),
        messages: planningMessages,
        tools: CHAT_TOOL_DEFINITIONS,
      });
      const toolUses = extractToolUseBlocks(planningResponse.content);

      if (toolUses.length === 0) {
        break;
      }

      planningMessages.push({
        role: "assistant",
        content: planningResponse.content ?? [],
      });

      const toolResults: AnthropicToolResultBlock[] = [];

      for (const toolUse of toolUses) {
        const execution = executeChatTool(toolUse.name, toolUse.input, {
          workingForm,
        });

        workingForm = execution.nextState.workingForm;
        if (execution.formWasUpdated) {
          workingEnrichmentContext = await resolveEnrichmentContext({
            form: workingForm,
            storedForm: conversation.currentForm,
            storedEnrichmentContext: conversation.currentEnrichmentContext,
          });
        }
        formWasUpdated = formWasUpdated || execution.formWasUpdated;
        calculationWasRun = calculationWasRun || execution.calculationWasRun;
        latestResult = mergeToolOutputIntoAnalysisResult({
          toolName: toolUse.name,
          output: execution.output,
          workingForm,
          previousResult: latestResult,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(
            {
              toolOutput: execution.output,
              stateEnvelope: buildStateEnvelope(
                workingForm,
                latestResult,
                workingEnrichmentContext,
              ),
            },
            null,
            2,
          ),
        });
      }

      planningMessages.push({
        role: "user",
        content: toolResults,
      });
    }

    const uploadedStoragePaths = Array.from(
      new Set(payload.uploadedStoragePaths ?? []),
    );
    const createSnapshot =
      formWasUpdated || calculationWasRun || uploadedStoragePaths.length > 0;
    const finalSystemPrompt = buildFinalSystemPrompt({
      form: workingForm,
      latestResult,
      enrichmentContext: workingEnrichmentContext,
      isOpeningTurn: conversation.messages.length === 0,
    });
    const encoder = new TextEncoder();
    let assistantMessage = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          await streamAnthropicFinalMessage({
            system: finalSystemPrompt,
            messages: planningMessages,
            onText(chunk) {
              assistantMessage += chunk;
              controller.enqueue(encoder.encode(chunk));
            },
          });

          await persistConversationTurn({
            client: supabase,
            conversationId: payload.conversationId,
            form: workingForm,
            enrichmentContext: workingEnrichmentContext,
            userMessage: payload.userMessage,
            assistantMessage: assistantMessage.trim(),
            createSnapshot,
            calculatedResults: latestResult,
            uploadedStoragePaths,
          });

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ongeldige chatinput.", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Chatverwerking is onverwacht mislukt.",
      },
      { status: 500 },
    );
  }
}
