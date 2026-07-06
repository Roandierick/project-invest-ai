"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AnalysisResultsCard } from "@/components/analysis-results-card";
import { ChatMarkdown } from "@/components/chat-markdown";
import { IssueList } from "@/components/issue-list";
import { TypingIndicator } from "@/components/typing-indicator";
import { WorkspaceFrame } from "@/components/workspace-frame";
import {
  emptyForm,
  mergeFormPatch,
  summarizeSubmission,
} from "@/lib/analysis/form";
import type { AnalysisFormState, BooleanChoice } from "@/lib/analysis/types";
import {
  createConversation,
  deleteConversation,
  loadWorkspaceBootstrap,
  type ConversationDetails,
  type ConversationSummary,
  type WorkspaceBootstrap,
} from "@/lib/conversations/repository";
import { createClient } from "@/lib/supabase/client";
import type { MergedListingExtraction } from "@/lib/vision/merge";

interface WorkspaceUser {
  id: string;
  email: string | null;
}

interface PersistentAnalysisWorkspaceProps {
  currentUser: WorkspaceUser | null;
  initialBootstrap: WorkspaceBootstrap;
  preferredConversationId?: string | null;
}

const EMPTY_WORKSPACE_BOOTSTRAP: WorkspaceBootstrap = {
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
};

const WORKSPACE_INITIALIZATION_TIMEOUT_MS = 5_000;

type ExtractionApiResponse = {
  merged: MergedListingExtraction;
  uploadedStoragePaths: string[];
  linkedToSnapshot: boolean;
  snapshotId: string;
  createdSnapshot: boolean;
};

type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  pending?: boolean;
};

type FieldConfig = {
  key: keyof AnalysisFormState;
  label: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: "text" | "date";
};

const REVIEW_FIELDS: Array<{
  key: keyof AnalysisFormState;
  label: string;
  mergeField: keyof MergedListingExtraction["fields"];
}> = [
  { key: "aankoopprijs", label: "Aankoopprijs", mergeField: "prijs" },
  { key: "postcode", label: "Postcode", mergeField: "postcode" },
  { key: "gemeente", label: "Gemeente", mergeField: "gemeente" },
  { key: "pandtype", label: "Pandtype", mergeField: "pandtype" },
  { key: "oppervlakte", label: "Oppervlakte", mergeField: "oppervlakte" },
  { key: "bouwjaar", label: "Bouwjaar", mergeField: "bouwjaar" },
  {
    key: "nietGeindexeerdKi",
    label: "Niet-geindexeerd KI",
    mergeField: "nietGeindexeerdKi",
  },
  { key: "epcLabel", label: "EPC-label", mergeField: "epcLabel" },
  {
    key: "aantalSlaapkamers",
    label: "Aantal slaapkamers",
    mergeField: "aantalSlaapkamers",
  },
];

const AUTO_EXTRACT_SUMMARY_FIELDS: Array<{
  key: keyof AnalysisFormState;
  label: string;
}> = [
  { key: "aankoopprijs", label: "aankoopprijs" },
  { key: "gemeente", label: "gemeente" },
  { key: "postcode", label: "postcode" },
  { key: "pandtype", label: "pandtype" },
  { key: "oppervlakte", label: "oppervlakte" },
  { key: "bouwjaar", label: "bouwjaar" },
  { key: "nietGeindexeerdKi", label: "niet-geindexeerd KI" },
  { key: "epcLabel", label: "EPC-label" },
  { key: "aantalSlaapkamers", label: "aantal slaapkamers" },
];

const PROPERTY_FIELDS: FieldConfig[] = [
  {
    key: "aankoopprijs",
    label: "Aankoopprijs",
    placeholder: "285000",
    inputMode: "decimal",
  },
  {
    key: "pandtype",
    label: "Pandtype",
    placeholder: "Appartement",
  },
  {
    key: "gemeente",
    label: "Gemeente",
    placeholder: "Gent",
  },
  {
    key: "postcode",
    label: "Postcode",
    placeholder: "9000",
    inputMode: "numeric",
  },
  {
    key: "gemeenteNisCode",
    label: "Gemeente NIS-code",
    placeholder: "44021",
    inputMode: "numeric",
  },
  {
    key: "oppervlakte",
    label: "Oppervlakte (m2)",
    placeholder: "85",
    inputMode: "decimal",
  },
  {
    key: "bouwjaar",
    label: "Bouwjaar",
    placeholder: "1978",
    inputMode: "numeric",
  },
  {
    key: "aantalSlaapkamers",
    label: "Aantal slaapkamers",
    placeholder: "2",
    inputMode: "numeric",
  },
  {
    key: "nietGeindexeerdKi",
    label: "Niet-geindexeerd KI",
    placeholder: "745",
    inputMode: "decimal",
  },
  {
    key: "epcLabel",
    label: "EPC-label",
    placeholder: "B",
  },
  {
    key: "maandelijkseHuur",
    label: "Maandelijkse huur",
    placeholder: "1100",
    inputMode: "decimal",
  },
];

const YIELD_FIELDS: FieldConfig[] = [
  {
    key: "onderhoudsPercentage",
    label: "Onderhoud (% per jaar)",
    placeholder: "1 of 1,5",
    inputMode: "decimal",
  },
  {
    key: "leegstandMaanden",
    label: "Leegstand (maanden/jaar)",
    placeholder: "1",
    inputMode: "decimal",
  },
  {
    key: "verzekeringJaarlijks",
    label: "Verzekering per jaar",
    placeholder: "350",
    inputMode: "decimal",
  },
  {
    key: "syndicusVmeJaarlijks",
    label: "Syndicus / VME per jaar",
    placeholder: "1200",
    inputMode: "decimal",
  },
  {
    key: "beheerkostenJaarlijks",
    label: "Beheerkosten per jaar",
    placeholder: "0",
    inputMode: "decimal",
  },
  {
    key: "eigenInbreng",
    label: "Eigen inbreng",
    placeholder: "85000",
    inputMode: "decimal",
  },
  {
    key: "jaarlijkseFinancieringslasten",
    label: "Jaarlijkse financieringslasten (rente)",
    placeholder: "enkel rente-deel indien gekend",
    inputMode: "decimal",
  },
];

const FINANCING_FIELDS: FieldConfig[] = [
  {
    key: "geleendBedrag",
    label: "Geleend bedrag",
    placeholder: "220000",
    inputMode: "decimal",
  },
  {
    key: "jaarlijkseRente",
    label: "Jaarlijkse rente (%)",
    placeholder: "3,5",
    inputMode: "decimal",
  },
  {
    key: "looptijdJaren",
    label: "Looptijd (jaren)",
    placeholder: "20",
    inputMode: "numeric",
  },
  {
    key: "nettoMaandinkomen",
    label: "Netto maandinkomen",
    placeholder: "4200",
    inputMode: "decimal",
  },
  {
    key: "kinderenTenLaste",
    label: "Kinderen ten laste",
    placeholder: "0",
    inputMode: "numeric",
  },
];

const FISCAL_FIELDS: FieldConfig[] = [
  {
    key: "compromisDatum",
    label: "Compromisdatum",
    type: "date",
  },
  {
    key: "authentiekeAkteDatum",
    label: "Datum authentieke akte",
    type: "date",
  },
  {
    key: "geschatteUitgavenAanDerdenExclBtw",
    label: "Uitgaven derden excl. btw",
    placeholder: "304",
    inputMode: "decimal",
  },
];

const ECB_MARKET_REFERENCE = {
  lastObservation: "2026-04",
  overall: 3.53,
  fixedLongTerm: 3.41,
  variableShortTerm: 4.24,
  sourceLabel: "ECB MIR housing loans, Belgium",
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function inputClassName() {
  return "w-full rounded-[0.95rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] leading-5 text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.14)]";
}

function selectClassName() {
  return `${inputClassName()} cursor-pointer`;
}

function cardClassName() {
  return "app-shell-card rounded-[1.45rem] p-4 md:p-5";
}

function sectionCardClassName() {
  return "rounded-[1.15rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4";
}

function mutedPillClassName() {
  return "rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-1 text-[11px] text-[var(--color-muted)]";
}

function fieldId(key: keyof AnalysisFormState) {
  return `field-${key}`;
}

function warningPanelClassName() {
  return "rounded-[0.95rem] border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] px-3 py-2.5 text-[13px] leading-5 text-[var(--color-warning)]";
}

function dangerPanelClassName() {
  return "rounded-[0.95rem] border border-[rgba(239,68,68,0.32)] bg-[rgba(239,68,68,0.12)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]";
}

function successPanelClassName() {
  return "rounded-[0.95rem] border border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.1)] px-3 py-2.5 text-[13px] text-[var(--color-success)]";
}

function renderSelectedFileSummary(files: File[]) {
  if (files.length === 0) {
    return "Sleep afbeeldingen hierheen of blader lokaal.";
  }

  if (files.length === 1) {
    return `1 afbeelding geselecteerd: ${files[0]?.name ?? "onbekend bestand"}`;
  }

  return `${files.length} afbeeldingen geselecteerd voor review.`;
}

function revokePreviewUrls(previews: Array<{ name: string; url: string }>) {
  previews.forEach((preview) => URL.revokeObjectURL(preview.url));
}

function hasSuggestedReviewValues(patch: Partial<AnalysisFormState>): boolean {
  return Object.values(patch).some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

function describeAutoExtractedValues(
  patch: Partial<AnalysisFormState>,
): string {
  return AUTO_EXTRACT_SUMMARY_FIELDS.flatMap(({ key, label }) => {
    const value = patch[key];

    if (typeof value !== "string" || value.trim().length === 0) {
      return [];
    }

    return [`${label}: ${value.trim()}`];
  }).join(", ");
}

function renderTextField(
  form: AnalysisFormState,
  updateForm: <K extends keyof AnalysisFormState>(
    key: K,
    value: AnalysisFormState[K],
  ) => void,
  config: FieldConfig,
) {
  const inputId = fieldId(config.key);

  return (
    <label
      key={config.key}
      htmlFor={inputId}
      className="flex flex-col gap-1.5 text-[13px] text-[var(--color-foreground)]"
    >
      <span className="text-[11px] font-medium tracking-[0.01em] text-[var(--color-muted)]">
        {config.label}
      </span>
      <input
        id={inputId}
        type={config.type ?? "text"}
        className={inputClassName()}
        inputMode={config.inputMode}
        value={form[config.key]}
        onChange={(event) =>
          updateForm(config.key, event.target.value as AnalysisFormState[typeof config.key])
        }
        placeholder={config.placeholder}
      />
    </label>
  );
}

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL(
              "/auth/callback",
              window.location.origin,
            ).toString(),
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        setMessage(
          "Account aangemaakt. Controleer je mailbox en bevestig eerst je e-mailadres voor je inlogt.",
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        window.location.href = "/";
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Authenticatie is mislukt.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8 md:px-6">
      <section className="grid w-full gap-6 rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_28px_60px_rgba(0,0,0,0.34)] lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
        <div className="rounded-[1.5rem] bg-[linear-gradient(160deg,rgba(27,58,92,0.95),rgba(10,16,26,0.92))] p-6 text-white">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/62">
            Project Invest AI
          </p>
          <h1 className="mt-4 font-[family:var(--font-display)] text-4xl leading-tight">
            Analysechats voor Belgische vastgoeddeals
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/78">
            Meld je aan om gesprekken, snapshots en berekeningen server-side in
            Supabase te bewaren. Elke deal wordt een aparte chat die je later
            gewoon hervat.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-6">
          <div className="flex gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted)]"
              }`}
            >
              Inloggen
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted)]"
              }`}
            >
              Account maken
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
              <span>E-mail</span>
              <input
                className={inputClassName()}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
              <span>Wachtwoord</span>
              <input
                className={inputClassName()}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>

            {message ? <div className={successPanelClassName()}>{message}</div> : null}

            {error ? <div className={dangerPanelClassName()}>{error}</div> : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-[1rem] bg-[var(--color-primary)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy
                ? "Even bezig..."
                : mode === "login"
                  ? "Inloggen"
                  : "Account aanmaken"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export function PersistentAnalysisWorkspace({
  currentUser,
  initialBootstrap,
  preferredConversationId = null,
}: PersistentAnalysisWorkspaceProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialBootstrap.conversations,
  );
  const [activeConversationId, setActiveConversationId] = useState(
    initialBootstrap.activeConversationId ?? "",
  );
  const [activeConversation, setActiveConversation] =
    useState<ConversationDetails | null>(initialBootstrap.activeConversation);
  const [form, setForm] = useState<AnalysisFormState>(
    initialBootstrap.activeConversation?.currentForm ?? emptyForm(),
  );
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [extracting, setExtracting] = useState(false);
  const [extractionStatusLabel, setExtractionStatusLabel] = useState(
    "Foto's worden uitgelezen...",
  );
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [reviewPatch, setReviewPatch] = useState<Partial<AnalysisFormState> | null>(
    null,
  );
  const [reviewFields, setReviewFields] =
    useState<MergedListingExtraction["fields"] | null>(null);
  const [reviewConflicts, setReviewConflicts] = useState<
    MergedListingExtraction["conflicts"]
  >([]);
  const [streamingTurn, setStreamingTurn] = useState<{
    userMessage: string;
    assistantMessage: string;
  } | null>(null);
  const [resolvedCurrentUser, setResolvedCurrentUser] = useState(currentUser);
  const [clientBootstrapReady, setClientBootstrapReady] = useState(
    currentUser !== null,
  );
  const [showWorkspaceFallback, setShowWorkspaceFallback] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const chatSectionRef = useRef<HTMLElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const preferredConversationIdRef = useRef(preferredConversationId);
  const hasInitializedWorkspaceRef = useRef(false);
  const shouldScrollToChatRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  const supabaseRef = useRef(supabase);

  const latestResult = activeConversation?.latestResult ?? null;
  const currentEnrichmentContext =
    activeConversation?.currentEnrichmentContext ?? null;
  const latestSnapshotVersion = activeConversation?.latestSnapshot?.version ?? 0;

  const displayedMessages: DisplayMessage[] = useMemo(() => {
    const persisted = (activeConversation?.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    }));

    if (!streamingTurn) {
      return persisted;
    }

    const now = new Date().toISOString();

    return [
      ...persisted,
      {
        id: "pending-user",
        role: "user",
        content: streamingTurn.userMessage,
        createdAt: now,
        pending: true,
      },
      {
        id: "pending-assistant",
        role: "assistant",
        content:
          streamingTurn.assistantMessage ||
          "Ik herlees het dossier en trek de cijfers opnieuw recht...",
        createdAt: now,
        pending: true,
      },
    ];
  }, [activeConversation?.messages, streamingTurn]);

  const scrollChatSectionIntoView = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      chatSectionRef.current?.scrollIntoView({
        behavior,
        block: "start",
      });
    },
    [],
  );

  const scrollChatEndIntoView = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      chatEndRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
    },
    [],
  );

  useEffect(
    () => () => {
      revokePreviewUrls(selectedFilePreviews);
    },
    [selectedFilePreviews],
  );

  const replaceSelectedFiles = useCallback((nextFiles: File[]) => {
    setSelectedFiles(nextFiles);
    setSelectedFilePreviews(
      nextFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    );
  }, []);

  useEffect(() => {
    preferredConversationIdRef.current = preferredConversationId;
  }, [preferredConversationId]);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const items = Array.from(event.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));

      if (imageItems.length === 0) {
        return;
      }

      const newFiles = imageItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (newFiles.length > 0) {
        replaceSelectedFiles([...selectedFiles, ...newFiles]);
      }
    }

    window.addEventListener("paste", handlePaste);

    return () => window.removeEventListener("paste", handlePaste);
  }, [replaceSelectedFiles, selectedFiles]);

  useEffect(() => {
    if (displayedMessages.length === 0 && !latestResult && !chatBusy) {
      return;
    }

    const behavior = shouldScrollToChatRef.current ? "smooth" : "auto";

    window.requestAnimationFrame(() => {
      if (shouldScrollToChatRef.current) {
        scrollChatSectionIntoView("smooth");
      }

      scrollChatEndIntoView(behavior);
      shouldScrollToChatRef.current = false;
    });
  }, [
    chatBusy,
    displayedMessages.length,
    latestResult,
    latestSnapshotVersion,
    scrollChatEndIntoView,
    scrollChatSectionIntoView,
  ]);

  const applyWorkspaceBootstrap = useCallback((next: WorkspaceBootstrap) => {
    setConversations(next.conversations);
    setActiveConversationId(next.activeConversationId ?? "");
    setActiveConversation(next.activeConversation);
    setForm(next.activeConversation?.currentForm ?? emptyForm());
  }, []);

  const clearTransientWorkspaceState = useCallback(() => {
    setComposer("");
    setStreamingTurn(null);
    setExtractionError(null);
    setReviewPatch(null);
    setReviewFields(null);
    setReviewConflicts([]);
    replaceSelectedFiles([]);
  }, [replaceSelectedFiles]);

  const clearActiveConversationState = useCallback(() => {
    setActiveConversationId("");
    setActiveConversation(null);
    setForm(emptyForm());
    clearTransientWorkspaceState();
  }, [clearTransientWorkspaceState]);

  const resetWorkspaceToEmpty = useCallback(() => {
    setConversations(EMPTY_WORKSPACE_BOOTSTRAP.conversations);
    clearActiveConversationState();
  }, [clearActiveConversationState]);

  const openFallbackWorkspace = useCallback((message: string) => {
    setShowWorkspaceFallback(true);
    setWorkspaceBusy(false);
    resetWorkspaceToEmpty();
    setError((current) => current ?? message);
    setClientBootstrapReady(true);
  }, [resetWorkspaceToEmpty]);

  const syncWorkspace = useCallback(async (
    client: ReturnType<typeof createClient>,
    preferredConversationIdOverride?: string | null,
  ) => {
    setWorkspaceBusy(true);

    try {
      const {
        data: { user },
      } = await client.auth.getUser();

      const nextUser = user ? { id: user.id, email: user.email ?? null } : null;
      setResolvedCurrentUser(nextUser);

      if (!nextUser) {
        setShowWorkspaceFallback(false);
        resetWorkspaceToEmpty();
        setError(null);
        return;
      }

      try {
        const nextBootstrap = await loadWorkspaceBootstrap(
          client,
          preferredConversationIdOverride ?? null,
        );
        applyWorkspaceBootstrap(nextBootstrap);
        setShowWorkspaceFallback(false);
        setError(null);
      } catch (workspaceLoadError) {
        setShowWorkspaceFallback(true);
        resetWorkspaceToEmpty();
        setError(
          workspaceLoadError instanceof Error
            ? workspaceLoadError.message
            : "Workspace laden is mislukt.",
        );
      }
    } catch (workspaceError) {
      setResolvedCurrentUser(null);
      setShowWorkspaceFallback(true);
      resetWorkspaceToEmpty();
      setError(
        workspaceError instanceof Error
          ? workspaceError.message
          : "Workspace laden is mislukt.",
      );
    } finally {
      setWorkspaceBusy(false);
      setClientBootstrapReady(true);
    }
  }, [applyWorkspaceBootstrap, resetWorkspaceToEmpty]);

  const syncWorkspaceRef = useRef(syncWorkspace);
  const openFallbackWorkspaceRef = useRef(openFallbackWorkspace);
  const resetWorkspaceToEmptyRef = useRef(resetWorkspaceToEmpty);

  useEffect(() => {
    syncWorkspaceRef.current = syncWorkspace;
  }, [syncWorkspace]);

  useEffect(() => {
    openFallbackWorkspaceRef.current = openFallbackWorkspace;
  }, [openFallbackWorkspace]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    resetWorkspaceToEmptyRef.current = resetWorkspaceToEmpty;
  }, [resetWorkspaceToEmpty]);

  useEffect(() => {
    let isCancelled = false;
    let initializationSettled = false;
    const timeoutId = window.setTimeout(() => {
      if (isCancelled || initializationSettled) {
        return;
      }

      openFallbackWorkspaceRef.current(
        "Workspace-initialisatie duurt langer dan verwacht. We tonen daarom alvast een lege workspace.",
      );
    }, WORKSPACE_INITIALIZATION_TIMEOUT_MS);

    async function initializeWorkspace() {
      try {
        if (isCancelled) {
          return;
        }

        setWorkspaceBusy(true);

        if (currentUserRef.current === null) {
          setWorkspaceBusy(false);
        }

        await syncWorkspaceRef.current(
          supabaseRef.current,
          preferredConversationIdRef.current,
        );
      } catch (workspaceError) {
        if (isCancelled) {
          return;
        }

        setResolvedCurrentUser(null);
        setShowWorkspaceFallback(true);
        resetWorkspaceToEmptyRef.current();
        setError(
          workspaceError instanceof Error
            ? workspaceError.message
            : "Workspace initialiseren is mislukt.",
        );
      } finally {
        if (!isCancelled) {
          setWorkspaceBusy(false);
          setClientBootstrapReady(true);
        }
        initializationSettled = true;
        hasInitializedWorkspaceRef.current = true;
        window.clearTimeout(timeoutId);
      }
    }

    void initializeWorkspace();

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  useEffect(() => {
    if (!hasInitializedWorkspaceRef.current) {
      return;
    }

    void syncWorkspaceRef.current(supabase, preferredConversationId);
  }, [preferredConversationId, supabase]);

  async function refreshWorkspace(preferredConversationId?: string | null) {
    const next = await loadWorkspaceBootstrap(
      supabase,
      preferredConversationId ?? activeConversationId ?? null,
    );

    applyWorkspaceBootstrap(next);
  }

  async function ensureConversation(): Promise<string> {
    if (!resolvedCurrentUser) {
      throw new Error("Geen actieve gebruiker beschikbaar.");
    }

    if (activeConversationId) {
      return activeConversationId;
    }

    const createdConversation = await createConversation(
      supabase,
      resolvedCurrentUser.id,
    );
    await refreshWorkspace(createdConversation.id);

    return createdConversation.id;
  }

  function updateForm<K extends keyof AnalysisFormState>(
    key: K,
    value: AnalysisFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function removeSelectedFile(indexToRemove: number) {
    const previewToRemove = selectedFilePreviews[indexToRemove];

    if (previewToRemove) {
      URL.revokeObjectURL(previewToRemove.url);
    }

    const remainingFiles = selectedFiles.filter(
      (_, index) => index !== indexToRemove,
    );

    replaceSelectedFiles(remainingFiles);

    if (remainingFiles.length === 0) {
      setExtractionError(null);
      setReviewPatch(null);
      setReviewFields(null);
      setReviewConflicts([]);
    }
  }

  function handleTextareaPaste(
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) {
    event.preventDefault();

    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    const newFiles = imageItems
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (newFiles.length > 0) {
      replaceSelectedFiles([...selectedFiles, ...newFiles]);
    }
  }

  function clearExtractionReviewState() {
    setReviewPatch(null);
    setReviewFields(null);
    setReviewConflicts([]);
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Uitloggen is mislukt.",
      );
    }
  }

  async function handleNewConversation() {
    if (!resolvedCurrentUser) {
      return;
    }

    setWorkspaceBusy(true);
    setError(null);

    try {
      const createdConversation = await createConversation(
        supabase,
        resolvedCurrentUser.id,
      );
      clearTransientWorkspaceState();
      await refreshWorkspace(createdConversation.id);
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Nieuwe chat starten is mislukt.",
      );
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function handleSelectConversation(conversationId: string) {
    setWorkspaceBusy(true);
    setError(null);

    try {
      clearTransientWorkspaceState();
      await refreshWorkspace(conversationId);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Chat laden is mislukt.",
      );
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    setError(null);

    try {
      await deleteConversation(supabase, conversationId);

      setConversations((current) =>
        current.filter((conversation) => conversation.id !== conversationId),
      );

      if (activeConversationId === conversationId) {
        clearActiveConversationState();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Chat verwijderen is mislukt.",
      );
      throw deleteError;
    }
  }

  async function streamChatTurn(
    userMessage: string,
    options?: {
      conversationIdOverride?: string;
      formOverride?: AnalysisFormState;
    },
  ) {
    const trimmedMessage = userMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    setChatBusy(true);
    setError(null);

    try {
      const conversationId =
        options?.conversationIdOverride ?? (await ensureConversation());
      const formForRequest = options?.formOverride ?? form;
      setActiveConversationId(conversationId);
      setStreamingTurn({
        userMessage: trimmedMessage,
        assistantMessage: "",
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          userMessage: trimmedMessage,
          form: formForRequest,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "De chatroute gaf geen bruikbaar antwoord.");
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("De chatresponse bevatte geen leesbare stream.");
      }

      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        assistantMessage += decoder.decode(value, { stream: true });
        setStreamingTurn({
          userMessage: trimmedMessage,
          assistantMessage,
        });
      }

      assistantMessage += decoder.decode();

      await refreshWorkspace(conversationId);
      setComposer("");
      setStreamingTurn(null);
    } catch (chatError) {
      setStreamingTurn(null);
      setError(
        chatError instanceof Error
          ? chatError.message
          : "De chatverwerking is mislukt.",
      );
    } finally {
      setChatBusy(false);
    }
  }

  async function handleComposerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    shouldScrollToChatRef.current = true;
    await streamChatTurn(composer);
  }

  async function requestPhotoExtraction(options?: {
    mode?: "review" | "automatic";
    baseForm?: AnalysisFormState;
  }) {
    const mode = options?.mode ?? "review";
    const baseForm = options?.baseForm ?? form;

    if (selectedFiles.length === 0) {
      if (mode === "review") {
        setExtractionError("Selecteer eerst minstens een afbeelding.");
      }
      return null;
    }

    setExtracting(true);
    setExtractionError(null);
    if (mode === "automatic") {
      clearExtractionReviewState();
    }
    setExtractionStatusLabel(
      mode === "automatic"
        ? "Foto's worden uitgelezen voor de analyse..."
        : "Foto's worden uitgelezen...",
    );

    try {
      const conversationId = await ensureConversation();
      const formData = new FormData();
      const snapshotId = activeConversation?.latestSnapshot?.id;

      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append("conversationId", conversationId);
      formData.append("form", JSON.stringify(baseForm));

      if (snapshotId) {
        formData.append("snapshotId", snapshotId);
      }

      const response = await fetch("/api/extract-listing", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | ExtractionApiResponse
        | { error?: string };
      const apiError = "error" in payload ? payload.error : undefined;

      if (!response.ok) {
        throw new Error(apiError || "Foto-extractie is mislukt.");
      }

      const data = payload as ExtractionApiResponse;

      if (data.createdSnapshot) {
        await refreshWorkspace(conversationId);
      }

      const suggestedPatch = data.merged.suggestedFormPatch;
      const hasSuggestedValues = hasSuggestedReviewValues(suggestedPatch);

      if (mode === "review") {
        if (!hasSuggestedValues) {
          clearExtractionReviewState();
          setExtractionError(
            "We konden geen gegevens uitlezen uit deze foto's. Probeer een duidelijkere screenshot of vul de gegevens handmatig in.",
          );
          return {
            conversationId,
            hasSuggestedValues,
            suggestedPatch,
          };
        }

        setReviewPatch(suggestedPatch);
        setReviewFields(data.merged.fields);
        setReviewConflicts(data.merged.conflicts);
      } else {
        clearExtractionReviewState();
      }

      return {
        conversationId,
        hasSuggestedValues,
        suggestedPatch,
      };
    } catch (loadError) {
      if (mode === "review") {
        setExtractionError(
          loadError instanceof Error
            ? loadError.message
            : "Foto-extractie is mislukt.",
        );
      } else {
        console.error(
          "Automatische foto-extractie vóór chatstart is mislukt.",
          loadError,
        );
      }

      return null;
    } finally {
      setExtracting(false);
      setExtractionStatusLabel("Foto's worden uitgelezen...");
    }
  }

  async function handleIntakeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    shouldScrollToChatRef.current = true;
    scrollChatSectionIntoView("smooth");

    let nextForm = form;
    let conversationIdOverride: string | undefined;
    let openingMessage = summarizeSubmission(form);

    const hasPhotos = selectedFiles.length > 0;
    const hasManualValues = Boolean(
      form.aankoopprijs || form.gemeente || form.postcode,
    );

    if (hasPhotos && !hasManualValues) {
      const extraction = await requestPhotoExtraction({
        mode: "automatic",
        baseForm: form,
      });

      if (extraction?.conversationId) {
        conversationIdOverride = extraction.conversationId;
      }

      if (extraction?.hasSuggestedValues) {
        nextForm = mergeFormPatch(form, extraction.suggestedPatch);
        setForm(nextForm);

        const extractedValues = describeAutoExtractedValues(
          extraction.suggestedPatch,
        );

        openingMessage = `${summarizeSubmission(nextForm)}${
          extractedValues
            ? ` De huidige dossierwaarden zijn automatisch uit mijn screenshots gelezen: ${extractedValues}. Vermeld expliciet welke waarden je gebruikt en vraag me te bevestigen of te corrigeren als iets niet klopt.`
            : ""
        }`;
      }
    }

    await streamChatTurn(openingMessage, {
      conversationIdOverride,
      formOverride: nextForm,
    });
  }

  async function handleExtractPhotos() {
    await requestPhotoExtraction({
      mode: "review",
      baseForm: form,
    });
  }

  function updateReviewPatch<K extends keyof AnalysisFormState>(
    key: K,
    value: AnalysisFormState[K],
  ) {
    setReviewPatch((current) => ({
      ...(current ?? {}),
      [key]: value,
    }));
  }

  function applyReviewPatch() {
    if (!reviewPatch) {
      return;
    }

    setForm((current) => mergeFormPatch(current, reviewPatch));
    setReviewPatch(null);

    if (!composer.trim()) {
      setComposer("Neem de waarden uit de nieuwe foto's mee en herbekijk het dossier.");
    }
  }

  if (!clientBootstrapReady) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-8 md:px-6">
        <section className="app-shell-card rounded-[1.75rem] p-8 text-[var(--color-foreground)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
            Workspace
          </p>
          <h1 className="mt-4 font-[family:var(--font-display)] text-4xl leading-tight text-[var(--color-foreground)]">
            Analyseworkspace wordt geladen
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
            We bouwen je chatruimte op zonder de pagina server-side te blokkeren.
          </p>
        </section>
      </main>
    );
  }

  if (!resolvedCurrentUser && !showWorkspaceFallback) {
    return <AuthPanel />;
  }

  return (
    <WorkspaceFrame
      currentUserEmail={resolvedCurrentUser?.email ?? null}
      currentUserId={resolvedCurrentUser?.id}
      conversations={conversations}
      activeConversationId={activeConversationId}
      activeNav="analyse"
      busy={workspaceBusy}
      onNewConversation={
        resolvedCurrentUser ? () => void handleNewConversation() : undefined
      }
      onSelectConversation={
        resolvedCurrentUser
          ? (conversationId) => void handleSelectConversation(conversationId)
          : undefined
      }
      onDeleteConversation={
        resolvedCurrentUser
          ? (conversationId) => handleDeleteConversation(conversationId)
          : undefined
      }
      onLogout={resolvedCurrentUser ? () => void handleLogout() : undefined}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] xl:items-start">
        {showWorkspaceFallback && !resolvedCurrentUser ? (
          <div className={`xl:col-span-2 ${warningPanelClassName()}`}>
            De sessie of chatgeschiedenis kon niet tijdig geladen worden. De
            lege workspace staat alvast open; ververs of log opnieuw in als
            acties niet reageren.
          </div>
        ) : null}

        <section className={`${cardClassName()} xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]`}>
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Intake
                </p>
                <h2 className="mt-2 font-[family:var(--font-display)] text-[1.65rem] leading-tight text-[var(--color-foreground)]">
                  Pandinvoer en foto-review
                </h2>
                <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[var(--color-muted)]">
                  Compact invullen wat je al weet. De rest kan later tijdens de
                  chat worden aangevuld of herberekend.
                </p>
              </div>
              <div className={mutedPillClassName()}>
                Snapshot v{latestSnapshotVersion || 0}
              </div>
            </div>

            {chatBusy || extracting ? (
              <div className="mt-4">
                <TypingIndicator
                  label={
                    extracting
                      ? extractionStatusLabel
                      : "Analyse wordt herberekend"
                  }
                />
              </div>
            ) : null}

            <form className="mt-4 flex min-h-0 flex-1 flex-col" onSubmit={handleIntakeSubmit}>
              <div className="subtle-scrollbar flex-1 space-y-4 overflow-y-auto pr-1 xl:pr-2">
                <section className={sectionCardClassName()}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                        Foto-upload
                      </h3>
                      <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
                        Screenshots en foto&apos;s worden samengevoegd tot een voorstel.
                      </p>
                    </div>
                    <div className={mutedPillClassName()}>
                      {selectedFiles.length} bestand(en)
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(220px,0.82fr)]">
                    <label className="block cursor-pointer rounded-[1rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-primary)]">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) =>
                          replaceSelectedFiles(Array.from(event.target.files ?? []))
                        }
                        className="sr-only"
                      />
                      <div className="flex h-full flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-foreground)]">
                            Upload screenshots of foto&apos;s
                          </p>
                          <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
                            {renderSelectedFileSummary(selectedFiles)}
                          </p>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2 text-[13px] font-medium text-[var(--color-primary)]">
                          Bladeren
                        </span>
                      </div>
                    </label>

                    <div className="flex flex-col gap-2">
                      <textarea
                        readOnly
                        value=""
                        onPaste={handleTextareaPaste}
                        placeholder="Plak hier je afbeeldingen"
                        className={`${inputClassName()} min-h-[108px] cursor-default resize-none border-dashed bg-[rgba(37,99,235,0.08)] placeholder:text-[var(--color-muted)]`}
                      />
                      <p className="text-[11px] leading-5 text-[var(--color-muted)]">
                        Ctrl+V blijft ook elders in de workspace werken.
                      </p>
                    </div>
                  </div>

                  {selectedFilePreviews.length > 0 ? (
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                      {selectedFilePreviews.map((preview, index) => (
                        <div
                          key={preview.url}
                          className="relative overflow-hidden rounded-[0.95rem] border border-[var(--color-border)] bg-[var(--color-surface)]"
                        >
                          <button
                            type="button"
                            aria-label={`Verwijder ${preview.name}`}
                            onClick={() => removeSelectedFile(index)}
                            className="absolute right-1.5 top-1.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-[rgba(0,0,0,0.55)] text-white/88 transition hover:border-[rgba(239,68,68,0.45)] hover:text-[var(--color-danger)]"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            >
                              <path d="M6 6l12 12" />
                              <path d="M18 6L6 18" />
                            </svg>
                          </button>
                          {/* eslint-disable-next-line @next/next/no-img-element -- Object URLs from local File previews are not supported through static image optimization. */}
                          <img
                            src={preview.url}
                            alt={preview.name}
                            className="h-[4.5rem] w-full object-cover"
                          />
                          <p className="truncate px-2.5 py-2 text-[11px] text-[var(--color-muted)]">
                            {preview.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExtractPhotos}
                      disabled={extracting || chatBusy}
                      className="rounded-[0.95rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60"
                    >
                      {extracting ? "Foto's worden uitgelezen..." : "Lees foto's uit"}
                    </button>
                    <p className="text-[11px] leading-5 text-[var(--color-muted)]">
                      Geen scraping: alleen jouw eigen beelden en screenshots.
                    </p>
                  </div>

                  {extractionError ? (
                    <div className={`mt-4 ${dangerPanelClassName()}`}>
                      {extractionError}
                    </div>
                  ) : null}

                  {reviewPatch && reviewFields ? (
                    <div className="mt-4 space-y-3">
                      <div className={warningPanelClassName()}>
                        Controleer de voorgestelde waarden en neem alleen over wat
                        jij effectief wilt laten meetellen.
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {REVIEW_FIELDS.map(({ key, label, mergeField }) => {
                          const fieldReview = reviewFields[mergeField];

                          return (
                            <label
                              key={key}
                              className="flex flex-col gap-1.5 rounded-[0.95rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[13px] text-[var(--color-foreground)]"
                            >
                              <span className="text-[11px] font-medium text-[var(--color-muted)]">
                                {label}
                              </span>
                              <input
                                className={inputClassName()}
                                value={(reviewPatch[key] as string | undefined) ?? ""}
                                onChange={(event) =>
                                  updateReviewPatch(
                                    key,
                                    event.target.value as AnalysisFormState[typeof key],
                                  )
                                }
                              />
                              <p className="text-[11px] text-[var(--color-muted)]">
                                Confidence {fieldReview.confidence}
                                {fieldReview.hasConflict
                                  ? " | conflict tussen afbeeldingen"
                                  : ""}
                              </p>
                              {fieldReview.candidates[0]?.evidence ? (
                                <p className="text-[11px] leading-5 text-[var(--color-muted)]">
                                  {fieldReview.candidates[0].evidence}
                                </p>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>

                      {reviewConflicts.length > 0 ? (
                        <div className="rounded-[0.95rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[13px] leading-5 text-[var(--color-foreground)]">
                          <p className="font-medium">Conflicten tussen afbeeldingen</p>
                          <div className="mt-2 space-y-1.5 text-[var(--color-muted)]">
                            {reviewConflicts.map((conflict) => (
                              <p key={conflict.field}>
                                {conflict.field}: {conflict.values.join(" / ")}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={applyReviewPatch}
                        className="w-full rounded-[0.95rem] bg-[var(--color-primary)] px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
                      >
                        Neem deze waarden over in het formulier
                      </button>
                    </div>
                  ) : null}
                </section>

                <FormSection
                  title="Pand en marktcontext"
                  description="Primair: deze velden bepalen meteen wat al berekend kan worden."
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <label
                      htmlFor={fieldId("gewest")}
                      className="flex flex-col gap-1.5 text-[13px] text-[var(--color-foreground)]"
                    >
                      <span className="text-[11px] font-medium text-[var(--color-muted)]">
                        Gewest
                      </span>
                      <select
                        id={fieldId("gewest")}
                        className={selectClassName()}
                        value={form.gewest}
                        onChange={(event) =>
                          updateForm(
                            "gewest",
                            event.target.value as AnalysisFormState["gewest"],
                          )
                        }
                      >
                        <option value="">Kies indien gekend</option>
                        <option value="vlaanderen">Vlaanderen</option>
                        <option value="brussel">Brussel</option>
                        <option value="wallonie">Wallonie</option>
                      </select>
                    </label>

                    <label
                      htmlFor={fieldId("aankoopSituatie")}
                      className="flex flex-col gap-1.5 text-[13px] text-[var(--color-foreground)]"
                    >
                      <span className="text-[11px] font-medium text-[var(--color-muted)]">
                        Aankoopsituatie
                      </span>
                      <select
                        id={fieldId("aankoopSituatie")}
                        className={selectClassName()}
                        value={form.aankoopSituatie}
                        onChange={(event) =>
                          updateForm(
                            "aankoopSituatie",
                            event.target.value as AnalysisFormState["aankoopSituatie"],
                          )
                        }
                      >
                        <option value="">Kies indien gekend</option>
                        <option value="investering_of_tweede">
                          Investering of tweede verblijf
                        </option>
                        <option value="enige_eigen_woning">
                          Enige eigen woning
                        </option>
                        <option value="beroepsverkoper">
                          Aankoop bij beroepsverkoper
                        </option>
                        <option value="ingrijpende_energetische_renovatie">
                          Historische IER-regeling
                        </option>
                        <option value="beschermd_monument">
                          Historische monumentenregeling
                        </option>
                      </select>
                    </label>

                    {PROPERTY_FIELDS.map((config) =>
                      renderTextField(form, updateForm, config),
                    )}
                  </div>
                </FormSection>

                <CollapsibleSection
                  title="Rendement en exploitatie"
                  description="Vuistregels worden alleen gebruikt als jij deze velden leeg laat."
                  defaultOpen
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {YIELD_FIELDS.map((config) =>
                      renderTextField(form, updateForm, config),
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Financiering"
                  description="Rente blijft altijd gebruikersinput. De marktindicatie hieronder is enkel context."
                  defaultOpen
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {FINANCING_FIELDS.map((config) =>
                      renderTextField(form, updateForm, config),
                    )}

                    <label
                      htmlFor={fieldId("leningType")}
                      className="flex flex-col gap-1.5 text-[13px] text-[var(--color-foreground)]"
                    >
                      <span className="text-[11px] font-medium text-[var(--color-muted)]">
                        Leningtype
                      </span>
                      <select
                        id={fieldId("leningType")}
                        className={selectClassName()}
                        value={form.leningType}
                        onChange={(event) =>
                          updateForm(
                            "leningType",
                            event.target.value as AnalysisFormState["leningType"],
                          )
                        }
                      >
                        <option value="">Kies indien gekend</option>
                        <option value="vast">Vast</option>
                        <option value="variabel">Variabel</option>
                      </select>
                    </label>

                    <BooleanSelect
                      label="Alleenstaand?"
                      value={form.alleenstaand}
                      onChange={(value) => updateForm("alleenstaand", value)}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <MetricBadge
                      label="Alle nieuwe woonleningen"
                      value={`${ECB_MARKET_REFERENCE.overall}%`}
                    />
                    <MetricBadge
                      label="Vast > 10 jaar"
                      value={`${ECB_MARKET_REFERENCE.fixedLongTerm}%`}
                    />
                    <MetricBadge
                      label="Variabel <= 1 jaar"
                      value={`${ECB_MARKET_REFERENCE.variableShortTerm}%`}
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Fiscale details / optioneel"
                  description="Datums en dossiernuances die je later ook nog kunt invullen."
                  defaultOpen={false}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {FISCAL_FIELDS.map((config) =>
                      renderTextField(form, updateForm, config),
                    )}

                    <BooleanSelect
                      label="Kopers zijn uitsluitend natuurlijke personen?"
                      value={form.kopersZijnUitsluitendNatuurlijkePersonen}
                      onChange={(value) =>
                        updateForm("kopersZijnUitsluitendNatuurlijkePersonen", value)
                      }
                    />
                    <BooleanSelect
                      label="Verwerving in volle eigendom?"
                      value={form.verwervingInVolleEigendom}
                      onChange={(value) =>
                        updateForm("verwervingInVolleEigendom", value)
                      }
                    />
                    <BooleanSelect
                      label="Andere woning in volle eigendom?"
                      value={form.heeftAndereWoningInVolleEigendom}
                      onChange={(value) =>
                        updateForm("heeftAndereWoningInVolleEigendom", value)
                      }
                    />
                    <BooleanSelect
                      label="Verkoop andere woning binnen tolerantie?"
                      value={form.verkooptAndereWoningBinnenTolerantie}
                      onChange={(value) =>
                        updateForm("verkooptAndereWoningBinnenTolerantie", value)
                      }
                    />
                    <BooleanSelect
                      label="Pand in kernstad of Vlaamse Rand?"
                      value={form.ligtInKernstadOfVlaamseRand}
                      onChange={(value) =>
                        updateForm("ligtInKernstadOfVlaamseRand", value)
                      }
                    />
                    <BooleanSelect
                      label="Eigen gezinswoning van de eigenaar?"
                      value={form.isEigenWoningVanEigenaar}
                      onChange={(value) =>
                        updateForm("isEigenWoningVanEigenaar", value)
                      }
                    />
                    <BooleanSelect
                      label="Kwalificerende handicap?"
                      value={form.invaliditeit}
                      onChange={(value) => updateForm("invaliditeit", value)}
                    />
                    <BooleanSelect
                      label="Eigenaar ouder dan 70?"
                      value={form.eigenaarOuderDan70}
                      onChange={(value) => updateForm("eigenaarOuderDan70", value)}
                    />
                  </div>
                </CollapsibleSection>

                <FormSection
                  title="Notities"
                  description="Korte context die de openingsanalyse meer kleur geeft."
                >
                  <label
                    htmlFor={fieldId("notes")}
                    className="flex flex-col gap-1.5 text-[13px] text-[var(--color-foreground)]"
                  >
                    <span className="text-[11px] font-medium text-[var(--color-muted)]">
                      Notities of context
                    </span>
                    <textarea
                      id={fieldId("notes")}
                      className={`${inputClassName()} min-h-20 resize-y`}
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      placeholder="Bijvoorbeeld: opknapper, lift te vernieuwen, verkoper wil snel sluiten..."
                    />
                  </label>
                </FormSection>
              </div>

              <div className="mt-4 border-t border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(26,26,26,0),var(--color-surface)_16%)] pt-4">
                {error ? (
                  <div className={dangerPanelClassName()}>
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={workspaceBusy || chatBusy}
                  className="mt-3 w-full rounded-[1rem] bg-[var(--color-primary)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {chatBusy
                    ? "Analyse wordt gestreamd..."
                    : activeConversation?.messages.length
                      ? "Werk deze chatanalyse bij"
                      : "Start analysechat"}
                </button>
                <p className="mt-3 text-[11px] leading-5 text-[var(--color-muted)]">
                  Na het starten springt de pagina automatisch naar de chat.
                  Aanpassingen doe je door terug naar boven te scrollen.
                </p>
              </div>
            </form>
          </div>
        </section>

        <section
          ref={chatSectionRef}
          className={`${cardClassName()} xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]`}
        >
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Chat
                </p>
                <h2 className="mt-2 font-[family:var(--font-display)] text-[1.45rem] leading-tight text-[var(--color-foreground)]">
                  {activeConversation?.summary.title ?? "Nieuwe analyse"}
                </h2>
                <p className="mt-2 text-[13px] leading-5 text-[var(--color-muted)]">
                  Eerlijk oordeel, herberekeningen en vervolgvragen in dezelfde
                  stroom.
                </p>
              </div>
              <div className={mutedPillClassName()}>
                {chatBusy ? "streaming" : latestResult?.status ?? "nog leeg"}
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              <div className="subtle-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
                {displayedMessages.length === 0 && !latestResult ? (
                  <div className="rounded-[1.2rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-5">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      Vertel me over een pand
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">
                      Start links je intake. Zodra de eerste analyse binnen is,
                      groeit dit paneel mee met het gesprek.
                    </p>
                  </div>
                ) : null}

                {displayedMessages.map((message) => {
                  const isAssistant = message.role === "assistant";

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                    >
                      <article
                        className={`w-full ${
                          isAssistant ? "max-w-full" : "max-w-[88%]"
                        } rounded-[1.2rem] px-4 py-3 ${
                          isAssistant
                            ? "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                            : "bg-[var(--color-primary)] text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p
                            className={`text-[0.66rem] font-semibold uppercase tracking-[0.16em] ${
                              isAssistant
                                ? "text-[var(--color-muted)]"
                                : "text-white/68"
                            }`}
                          >
                            {isAssistant ? "Assistant" : "Gebruiker"}
                          </p>
                          <p
                            className={`text-[11px] ${
                              isAssistant
                                ? "text-[var(--color-muted)]"
                                : "text-white/68"
                            }`}
                          >
                            {message.pending
                              ? "nu bezig..."
                              : formatDateTime(message.createdAt)}
                          </p>
                        </div>

                        <ChatMarkdown className="mt-2.5" content={message.content} />

                        {message.pending && isAssistant ? (
                          <div className="mt-3">
                            <TypingIndicator label="Antwoord stroomt binnen" />
                          </div>
                        ) : null}
                      </article>
                    </div>
                  );
                })}

                {latestResult ? (
                  <article className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Assistant snapshotanalyse
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)]">
                        {activeConversation?.latestSnapshot
                          ? formatDateTime(activeConversation.latestSnapshot.createdAt)
                          : "Laatste berekening"}
                      </p>
                    </div>

                    <div className="mt-3">
                      <AnalysisResultsCard
                        result={latestResult}
                        form={form}
                        enrichmentContext={currentEnrichmentContext}
                      />
                    </div>

                    <div className="mt-3">
                      <IssueList
                        issues={latestResult.issues ?? []}
                        emptyMessage="Geen openstaande issues in deze berekening."
                      />
                    </div>
                  </article>
                ) : null}

                <div ref={chatEndRef} />
              </div>

              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <form
                  className="rounded-[1.15rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3"
                  onSubmit={handleComposerSubmit}
                >
                  <label className="flex flex-col gap-1.5 text-[13px] text-[var(--color-foreground)]">
                    <span className="text-[11px] font-medium text-[var(--color-muted)]">
                      Vervolgvraag of wijziging
                    </span>
                    <textarea
                      className={`${inputClassName()} min-h-20 resize-y`}
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      placeholder="Bijvoorbeeld: herbereken met 1.150 euro huur."
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] leading-5 text-[var(--color-muted)]">
                      Hou het best bij één concrete vraag per beurt.
                    </p>
                    <button
                      type="submit"
                      disabled={workspaceBusy || chatBusy || !composer.trim()}
                      className="rounded-[0.95rem] bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:opacity-60"
                    >
                      {chatBusy ? "Stream bezig..." : "Verstuur"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </WorkspaceFrame>
  );
}

function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={sectionCardClassName()}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
            {title}
          </h3>
          <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
            {description}
          </p>
        </div>
        <span
          className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out"
        style={{
          marginTop: open ? "1rem" : "0",
          maxHeight: open ? "1200px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div>{children}</div>
      </div>
    </section>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={sectionCardClassName()}>
      <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
        {title}
      </h3>
      <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[8.5rem] rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold text-[var(--color-foreground)]">
        {value}
      </p>
    </div>
  );
}

function BooleanSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BooleanChoice;
  onChange: (value: BooleanChoice) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-[var(--color-foreground)]">
      <span className="text-[11px] font-medium tracking-[0.01em] text-[var(--color-muted)]">
        {label}
      </span>
      <select
        className={selectClassName()}
        value={value}
        onChange={(event) => onChange(event.target.value as BooleanChoice)}
      >
        <option value="">Onbekend</option>
        <option value="true">Ja</option>
        <option value="false">Nee</option>
      </select>
    </label>
  );
}
