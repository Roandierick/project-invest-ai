import { berekenBasisAnalyse } from "@/lib/analysis/calculate";
import { deriveTitle } from "@/lib/analysis/form";
import type {
  AnalysisFormState,
  BaselineAnalysisResult,
} from "@/lib/analysis/types";
import type { EnrichmentContext } from "@/lib/enrichment/types";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  appendAnalysisSnapshot,
  attachUploadsToSnapshot,
  appendMessagePair,
} from "@/lib/conversations/repository";

type DatabaseClient = SupabaseClient<Database>;

export interface PersistTurnInput {
  client: DatabaseClient;
  conversationId: string;
  form: AnalysisFormState;
  enrichmentContext?: EnrichmentContext | null;
  userMessage: string;
  assistantMessage: string;
  createSnapshot: boolean;
  calculatedResults?: BaselineAnalysisResult;
  uploadedStoragePaths?: string[];
}

export async function persistConversationTurn(
  input: PersistTurnInput,
): Promise<void> {
  const derivedTitle = deriveTitle(input.form);

  if (input.createSnapshot) {
    const snapshot = await appendAnalysisSnapshot(input.client, {
      conversationId: input.conversationId,
      title: derivedTitle,
      form: input.form,
      enrichmentContext: input.enrichmentContext ?? null,
      calculatedResults: input.calculatedResults ?? berekenBasisAnalyse(input.form),
      userMessage: input.userMessage,
      assistantMessage: input.assistantMessage,
    });

    if (snapshot?.snapshot_id && input.uploadedStoragePaths?.length) {
      await attachUploadsToSnapshot(input.client, {
        snapshotId: snapshot.snapshot_id,
        storagePaths: input.uploadedStoragePaths,
      });
    }

    return;
  }

  await appendMessagePair(input.client, {
    conversationId: input.conversationId,
    title: derivedTitle,
    userMessage: input.userMessage,
    assistantMessage: input.assistantMessage,
  });
}
