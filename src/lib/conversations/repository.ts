import type { SupabaseClient } from "@supabase/supabase-js";

import { emptyForm } from "@/lib/analysis/form";
import type {
  AnalysisFormState,
  BaselineAnalysisResult,
  StoredAnalysisInputData,
} from "@/lib/analysis/types";
import type { EnrichmentContext } from "@/lib/enrichment/types";
import type { Database, Json } from "@/lib/supabase/database.types";

type DatabaseClient = SupabaseClient<Database>;
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type SnapshotRow = Database["public"]["Tables"]["analysis_snapshots"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ConversationSummaryRow = Pick<
  ConversationRow,
  "id" | "titel" | "created_at" | "updated_at"
>;

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  snapshotId: string | null;
  createdAt: string;
}

export interface ConversationSnapshot {
  id: string;
  version: number;
  inputData: AnalysisFormState;
  enrichmentContext: EnrichmentContext | null;
  calculatedResults: BaselineAnalysisResult | null;
  createdAt: string;
}

export interface ConversationDetails {
  summary: ConversationSummary;
  snapshots: ConversationSnapshot[];
  messages: ConversationMessage[];
  latestSnapshot: ConversationSnapshot | null;
  currentForm: AnalysisFormState;
  currentEnrichmentContext: EnrichmentContext | null;
  latestResult: BaselineAnalysisResult | null;
}

export interface WorkspaceBootstrap {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  activeConversation: ConversationDetails | null;
}

export interface AppendSnapshotInput {
  conversationId: string;
  title: string;
  form: AnalysisFormState;
  enrichmentContext?: EnrichmentContext | null;
  calculatedResults: BaselineAnalysisResult;
  userMessage: string;
  assistantMessage: string;
}

export interface AppendMessagePairInput {
  conversationId: string;
  title?: string;
  userMessage: string;
  assistantMessage: string;
}

export interface AttachUploadsToSnapshotInput {
  snapshotId: string;
  storagePaths: string[];
}

export interface EnsureConversationSnapshotInput {
  conversationId: string;
  form: AnalysisFormState;
  enrichmentContext?: EnrichmentContext | null;
}

function mapConversation(row: ConversationSummaryRow): ConversationSummary {
  return {
    id: row.id,
    title: row.titel?.trim() || "Nieuwe analyse",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function coerceString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapFormShape(value: Json): AnalysisFormState {
  const fallback = emptyForm();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const candidate = value as Partial<Record<keyof AnalysisFormState, unknown>>;

  return {
    aankoopprijs: coerceString(candidate.aankoopprijs),
    postcode: coerceString(candidate.postcode),
    gemeente: coerceString(candidate.gemeente),
    gemeenteNisCode: coerceString(candidate.gemeenteNisCode),
    pandtype: coerceString(candidate.pandtype),
    oppervlakte: coerceString(candidate.oppervlakte),
    bouwjaar: coerceString(candidate.bouwjaar),
    nietGeindexeerdKi: coerceString(candidate.nietGeindexeerdKi),
    epcLabel: coerceString(candidate.epcLabel),
    aantalSlaapkamers: coerceString(candidate.aantalSlaapkamers),
    maandelijkseHuur: coerceString(candidate.maandelijkseHuur),
    onderhoudsPercentage: coerceString(candidate.onderhoudsPercentage),
    leegstandMaanden: coerceString(candidate.leegstandMaanden),
    verzekeringJaarlijks: coerceString(candidate.verzekeringJaarlijks),
    syndicusVmeJaarlijks: coerceString(candidate.syndicusVmeJaarlijks),
    beheerkostenJaarlijks: coerceString(candidate.beheerkostenJaarlijks),
    eigenInbreng: coerceString(candidate.eigenInbreng),
    jaarlijkseFinancieringslasten: coerceString(
      candidate.jaarlijkseFinancieringslasten,
    ),
    geleendBedrag: coerceString(candidate.geleendBedrag),
    jaarlijkseRente: coerceString(candidate.jaarlijkseRente),
    looptijdJaren: coerceString(candidate.looptijdJaren),
    leningType: (candidate.leningType as AnalysisFormState["leningType"]) || "",
    nettoMaandinkomen: coerceString(candidate.nettoMaandinkomen),
    alleenstaand:
      (candidate.alleenstaand as AnalysisFormState["alleenstaand"]) || "",
    gewest: (candidate.gewest as AnalysisFormState["gewest"]) || "",
    aankoopSituatie:
      (candidate.aankoopSituatie as AnalysisFormState["aankoopSituatie"]) || "",
    compromisDatum: coerceString(candidate.compromisDatum),
    authentiekeAkteDatum: coerceString(candidate.authentiekeAkteDatum),
    kopersZijnUitsluitendNatuurlijkePersonen:
      (candidate.kopersZijnUitsluitendNatuurlijkePersonen as AnalysisFormState["kopersZijnUitsluitendNatuurlijkePersonen"]) ||
      "",
    verwervingInVolleEigendom:
      (candidate.verwervingInVolleEigendom as AnalysisFormState["verwervingInVolleEigendom"]) ||
      "",
    heeftAndereWoningInVolleEigendom:
      (candidate.heeftAndereWoningInVolleEigendom as AnalysisFormState["heeftAndereWoningInVolleEigendom"]) ||
      "",
    verkooptAndereWoningBinnenTolerantie:
      (candidate.verkooptAndereWoningBinnenTolerantie as AnalysisFormState["verkooptAndereWoningBinnenTolerantie"]) ||
      "",
    ligtInKernstadOfVlaamseRand:
      (candidate.ligtInKernstadOfVlaamseRand as AnalysisFormState["ligtInKernstadOfVlaamseRand"]) ||
      "",
    geschatteUitgavenAanDerdenExclBtw: coerceString(
      candidate.geschatteUitgavenAanDerdenExclBtw,
    ),
    isEigenWoningVanEigenaar:
      (candidate.isEigenWoningVanEigenaar as AnalysisFormState["isEigenWoningVanEigenaar"]) ||
      "",
    kinderenTenLaste: coerceString(candidate.kinderenTenLaste),
    invaliditeit:
      (candidate.invaliditeit as AnalysisFormState["invaliditeit"]) || "",
    eigenaarOuderDan70:
      (candidate.eigenaarOuderDan70 as AnalysisFormState["eigenaarOuderDan70"]) ||
      "",
    erfbelastingOnroerendAandeel: coerceString(
      candidate.erfbelastingOnroerendAandeel,
    ),
    erfbelastingRoerendAandeel: coerceString(
      candidate.erfbelastingRoerendAandeel,
    ),
    erfbelastingGroepsTotaal: coerceString(
      candidate.erfbelastingGroepsTotaal,
    ),
    erfbelastingVerwantschap:
      (candidate.erfbelastingVerwantschap as AnalysisFormState["erfbelastingVerwantschap"]) ||
      "",
    erfbelastingGewest:
      (candidate.erfbelastingGewest as AnalysisFormState["erfbelastingGewest"]) ||
      "",
    erfbelastingIsLangstlevendePartner:
      (candidate.erfbelastingIsLangstlevendePartner as AnalysisFormState["erfbelastingIsLangstlevendePartner"]) ||
      "",
    erfbelastingIsGezinswoning:
      (candidate.erfbelastingIsGezinswoning as AnalysisFormState["erfbelastingIsGezinswoning"]) ||
      "",
    notes: coerceString(candidate.notes),
  };
}

function mapStoredEnrichmentContext(value: unknown): EnrichmentContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as EnrichmentContext;
}

function mapStoredSnapshotInputData(value: Json): StoredAnalysisInputData {
  if (value && typeof value === "object" && !Array.isArray(value) && "form" in value) {
    const wrapped = value as { form?: Json; enrichmentContext?: unknown };

    return {
      form: mapFormShape(wrapped.form as Json),
      enrichmentContext: mapStoredEnrichmentContext(wrapped.enrichmentContext),
    };
  }

  return {
    form: mapFormShape(value),
    enrichmentContext: null,
  };
}

function mapStoredResults(value: Json | null): BaselineAnalysisResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as unknown as BaselineAnalysisResult;
}

function mapSnapshot(row: SnapshotRow): ConversationSnapshot {
  const snapshotInput = mapStoredSnapshotInputData(row.input_data);

  return {
    id: row.id,
    version: row.version,
    inputData: snapshotInput.form,
    enrichmentContext: snapshotInput.enrichmentContext ?? null,
    calculatedResults: mapStoredResults(row.calculated_results),
    createdAt: row.created_at,
  };
}

function mapMessage(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    snapshotId: row.snapshot_id,
    createdAt: row.created_at,
  };
}

export async function listConversationSummaries(
  client: DatabaseClient,
): Promise<ConversationSummary[]> {
  const { data, error } = await client
    .from("conversations")
    .select("id,titel,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapConversation);
}

export async function createConversation(
  client: DatabaseClient,
  userId: string,
  title = "Nieuwe analyse",
): Promise<ConversationSummary> {
  const { data, error } = await client
    .from("conversations")
    .insert({
      user_id: userId,
      titel: title,
    })
    .select("id,titel,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapConversation(data);
}

export async function getConversationDetails(
  client: DatabaseClient,
  conversationId: string,
): Promise<ConversationDetails | null> {
  const [{ data: conversation, error: conversationError }, { data: snapshots, error: snapshotsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      client
        .from("conversations")
        .select("id,titel,created_at,updated_at")
        .eq("id", conversationId)
        .maybeSingle(),
      client
        .from("analysis_snapshots")
        .select("id,conversation_id,version,input_data,calculated_results,created_at")
        .eq("conversation_id", conversationId)
        .order("version", { ascending: false }),
      client
        .from("messages")
        .select("id,conversation_id,role,content,snapshot_id,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

  if (conversationError) {
    throw conversationError;
  }

  if (snapshotsError) {
    throw snapshotsError;
  }

  if (messagesError) {
    throw messagesError;
  }

  if (!conversation) {
    return null;
  }

  const mappedSnapshots = (snapshots ?? []).map(mapSnapshot);
  const latestSnapshot = mappedSnapshots[0] ?? null;

  return {
    summary: mapConversation(conversation),
    snapshots: mappedSnapshots,
    messages: (messages ?? []).map(mapMessage),
    latestSnapshot,
    currentForm: latestSnapshot?.inputData ?? emptyForm(),
    currentEnrichmentContext: latestSnapshot?.enrichmentContext ?? null,
    latestResult: latestSnapshot?.calculatedResults ?? null,
  };
}

export async function appendAnalysisSnapshot(
  client: DatabaseClient,
  input: AppendSnapshotInput,
) {
  const snapshotInputData: StoredAnalysisInputData = {
    form: input.form,
    enrichmentContext: input.enrichmentContext ?? null,
  };

  const { data, error } = await client.rpc("append_analysis_snapshot", {
    target_conversation_id: input.conversationId,
    next_title: input.title,
    input_data: snapshotInputData as unknown as Json,
    calculated_results: input.calculatedResults as unknown as Json,
    user_content: input.userMessage,
    assistant_content: input.assistantMessage,
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function ensureConversationSnapshot(
  client: DatabaseClient,
  input: EnsureConversationSnapshotInput,
) {
  const snapshotInputData: StoredAnalysisInputData = {
    form: input.form,
    enrichmentContext: input.enrichmentContext ?? null,
  };

  const { data, error } = await client.rpc("ensure_conversation_snapshot", {
    target_conversation_id: input.conversationId,
    input_data: snapshotInputData as unknown as Json,
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function appendMessagePair(
  client: DatabaseClient,
  input: AppendMessagePairInput,
) {
  const { error: messageError } = await client.from("messages").insert([
    {
      conversation_id: input.conversationId,
      role: "user",
      content: input.userMessage,
    },
    {
      conversation_id: input.conversationId,
      role: "assistant",
      content: input.assistantMessage,
    },
  ]);

  if (messageError) {
    throw messageError;
  }

  const { error: conversationError } = await client
    .from("conversations")
    .update({
      titel: input.title?.trim() || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.conversationId);

  if (conversationError) {
    throw conversationError;
  }
}

export async function attachUploadsToSnapshot(
  client: DatabaseClient,
  input: AttachUploadsToSnapshotInput,
) {
  const storagePaths = Array.from(
    new Set(
      input.storagePaths
        .map((storagePath) => storagePath.trim())
        .filter((storagePath) => storagePath.length > 0),
    ),
  );

  if (storagePaths.length === 0) {
    return;
  }

  const { error } = await client.from("uploads").insert(
    storagePaths.map((storagePath) => ({
      snapshot_id: input.snapshotId,
      storage_path: storagePath,
    })),
  );

  if (error) {
    throw error;
  }
}

export async function loadWorkspaceBootstrap(
  client: DatabaseClient,
  preferredConversationId?: string | null,
): Promise<WorkspaceBootstrap> {
  const conversations = await listConversationSummaries(client);
  const activeConversationId =
    preferredConversationId && conversations.some((item) => item.id === preferredConversationId)
      ? preferredConversationId
      : conversations[0]?.id ?? null;
  const activeConversation = activeConversationId
    ? await getConversationDetails(client, activeConversationId)
    : null;

  return {
    conversations,
    activeConversationId,
    activeConversation,
  };
}
