"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AnalysisResultsCard } from "@/components/analysis-results-card";
import { IssueList } from "@/components/issue-list";
import { TypingIndicator } from "@/components/typing-indicator";
import { WorkspaceFrame } from "@/components/workspace-frame";
import {
  emptyForm,
  mergeFormPatch,
  parseOptionalNumber,
  summarizeSubmission,
} from "@/lib/analysis/form";
import type { AnalysisFormState, BooleanChoice } from "@/lib/analysis/types";
import { formatCurrency } from "@/lib/calc-engine";
import {
  createConversation,
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

const percentPointFormatter = new Intl.NumberFormat("nl-BE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatPercentPoints(value?: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return "n.v.t.";
  }

  return `${percentPointFormatter.format(value)}%`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function inputClassName() {
  return "rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(27,58,92,0.12)]";
}

function selectClassName() {
  return inputClassName();
}

function cardClassName() {
  return "app-shell-card rounded-[1.75rem] p-5 md:p-6";
}

function mutedPillClassName() {
  return "rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs text-[var(--color-muted)]";
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

function renderTextField(
  form: AnalysisFormState,
  updateForm: <K extends keyof AnalysisFormState>(
    key: K,
    value: AnalysisFormState[K],
  ) => void,
  config: FieldConfig,
) {
  return (
    <label
      key={config.key}
      className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]"
    >
      <span>{config.label}</span>
      <input
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
  const router = useRouter();
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

        router.push("/");
        router.refresh();
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
      <section className="grid w-full gap-6 rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_12px_30px_rgba(27,58,92,0.08)] lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
        <div className="rounded-[1.5rem] bg-[var(--color-primary)] p-6 text-white">
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

            {message ? (
              <div className="rounded-2xl border border-[#D3E6DB] bg-[#F1F8F4] px-4 py-3 text-sm text-[var(--color-success)]">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-[#E7C7C7] bg-[#FAEEEE] px-4 py-3 text-sm text-[var(--color-danger)]">
                {error}
              </div>
            ) : null}

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
  const preferredConversationIdRef = useRef(preferredConversationId);
  const hasInitializedWorkspaceRef = useRef(false);

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

  useEffect(
    () => () => {
      revokePreviewUrls(selectedFilePreviews);
    },
    [selectedFilePreviews],
  );

  useEffect(() => {
    preferredConversationIdRef.current = preferredConversationId;
  }, [preferredConversationId]);

  const applyWorkspaceBootstrap = useCallback((next: WorkspaceBootstrap) => {
    setConversations(next.conversations);
    setActiveConversationId(next.activeConversationId ?? "");
    setActiveConversation(next.activeConversation);
    setForm(next.activeConversation?.currentForm ?? emptyForm());
  }, []);

  const resetWorkspaceToEmpty = useCallback(() => {
    setConversations(EMPTY_WORKSPACE_BOOTSTRAP.conversations);
    setActiveConversationId("");
    setActiveConversation(null);
    setForm(emptyForm());
  }, []);

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

  useEffect(() => {
    syncWorkspaceRef.current = syncWorkspace;
  }, [syncWorkspace]);

  useEffect(() => {
    openFallbackWorkspaceRef.current = openFallbackWorkspace;
  }, [openFallbackWorkspace]);

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

        if (currentUser === null) {
          setWorkspaceBusy(false);
        }

        await syncWorkspaceRef.current(
          supabase,
          preferredConversationIdRef.current,
        );
      } catch (workspaceError) {
        if (isCancelled) {
          return;
        }

        setResolvedCurrentUser(null);
        setShowWorkspaceFallback(true);
        resetWorkspaceToEmpty();
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
  }, [router]);

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

  function replaceSelectedFiles(nextFiles: File[]) {
    setSelectedFiles(nextFiles);
    setSelectedFilePreviews(
      nextFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    );
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
      setComposer("");
      setStreamingTurn(null);
      setReviewPatch(null);
      setReviewFields(null);
      setReviewConflicts([]);
      replaceSelectedFiles([]);
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
      setComposer("");
      setStreamingTurn(null);
      setReviewPatch(null);
      setReviewFields(null);
      setReviewConflicts([]);
      replaceSelectedFiles([]);
      await refreshWorkspace(conversationId);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Chat laden is mislukt.",
      );
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function streamChatTurn(userMessage: string) {
    const trimmedMessage = userMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    setChatBusy(true);
    setError(null);

    try {
      const conversationId = await ensureConversation();
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
          form,
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

  async function handleIntakeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await streamChatTurn(summarizeSubmission(form));
  }

  async function handleComposerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await streamChatTurn(composer);
  }

  async function handleExtractPhotos() {
    if (selectedFiles.length === 0) {
      setExtractionError("Selecteer eerst minstens een afbeelding.");
      return;
    }

    setExtracting(true);
    setExtractionError(null);

    try {
      const conversationId = await ensureConversation();
      const formData = new FormData();
      const snapshotId = activeConversation?.latestSnapshot?.id;

      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append("conversationId", conversationId);
      formData.append("form", JSON.stringify(form));

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

      if (!hasSuggestedReviewValues(data.merged.suggestedFormPatch)) {
        setReviewPatch(null);
        setReviewFields(null);
        setReviewConflicts([]);
        setExtractionError(
          "We konden geen gegevens uitlezen uit deze foto's. Probeer een duidelijkere screenshot of vul de gegevens handmatig in.",
        );
        return;
      }

      setReviewPatch(data.merged.suggestedFormPatch);
      setReviewFields(data.merged.fields);
      setReviewConflicts(data.merged.conflicts);
    } catch (loadError) {
      setExtractionError(
        loadError instanceof Error
          ? loadError.message
          : "Foto-extractie is mislukt.",
      );
    } finally {
      setExtracting(false);
    }
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
      onLogout={resolvedCurrentUser ? () => void handleLogout() : undefined}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(350px,470px)_minmax(0,1fr)]">
        {showWorkspaceFallback && !resolvedCurrentUser ? (
          <div className="rounded-[1.25rem] border border-[#F1D3B5] bg-[#FFF4E8] px-5 py-4 text-sm leading-6 text-[var(--color-warning)] xl:col-span-2">
            De sessie of chatgeschiedenis kon niet tijdig geladen worden. De
            lege workspace staat alvast open; ververs of log opnieuw in als
            acties niet reageren.
          </div>
        ) : null}

        <section className={cardClassName()}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Intake
              </p>
              <h2 className="mt-3 font-[family:var(--font-display)] text-3xl text-[var(--color-foreground)]">
                Pandinvoer en foto-review
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                Geen velden zijn verplicht. Vul in wat je al weet en laat de
                vision-review de rest aanvullen waar dat helpt.
              </p>
            </div>
            <div className={mutedPillClassName()}>
              Snapshot v{latestSnapshotVersion || 0}
            </div>
          </div>

          {chatBusy || extracting ? (
            <div className="mt-5">
              <TypingIndicator
                label={
                  extracting
                    ? "Foto's worden uitgelezen"
                    : "Analyse wordt herberekend"
                }
              />
            </div>
          ) : null}

          <div className="mt-6 rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                  Foto&apos;s van advertentie of pand
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  De AI leest alleen wat zichtbaar is. Jij kiest daarna welke
                  waarden effectief in het dossier landen.
                </p>
              </div>
              <div className={mutedPillClassName()}>
                {selectedFiles.length} bestand(en)
              </div>
            </div>

            <label className="mt-4 block cursor-pointer rounded-[1.2rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  replaceSelectedFiles(Array.from(event.target.files ?? []))
                }
                className="sr-only"
              />
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    Upload screenshots of foto&apos;s
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                    {renderSelectedFileSummary(selectedFiles)}
                  </p>
                </div>
                <span className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2 text-sm text-[var(--color-primary)]">
                  Bladeren
                </span>
              </div>
            </label>

            {selectedFilePreviews.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {selectedFilePreviews.map((preview) => (
                  <div
                    key={preview.url}
                    className="overflow-hidden rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Object URLs from local File previews are not supported through static image optimization. */}
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="h-24 w-full object-cover"
                    />
                    <p className="truncate px-3 py-2 text-xs text-[var(--color-muted)]">
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
                className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60"
              >
                {extracting ? "Foto's worden uitgelezen..." : "Lees foto's uit"}
              </button>
              <p className="text-xs leading-5 text-[var(--color-muted)]">
                Geen scraping: alleen jouw eigen beelden en screenshots.
              </p>
            </div>

            {extractionError ? (
              <div className="mt-4 rounded-[1rem] border border-[#E7C7C7] bg-[#FAEEEE] px-4 py-3 text-sm text-[var(--color-danger)]">
                {extractionError}
              </div>
            ) : null}

            {reviewPatch && reviewFields ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[1rem] border border-[#F1D3B5] bg-[#FFF4E8] px-4 py-4 text-sm leading-6 text-[var(--color-warning)]">
                  Controleer de voorgestelde waarden en neem alleen over wat jij
                  wilt laten meewegen in de analyse.
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {REVIEW_FIELDS.map(({ key, label, mergeField }) => {
                    const fieldReview = reviewFields[mergeField];

                    return (
                      <label
                        key={key}
                        className="flex flex-col gap-2 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-foreground)]"
                      >
                        <span className="font-medium">{label}</span>
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
                        <p className="text-xs text-[var(--color-muted)]">
                          Confidence {fieldReview.confidence}
                          {fieldReview.hasConflict
                            ? " | conflict tussen afbeeldingen"
                            : ""}
                        </p>
                        {fieldReview.candidates[0]?.evidence ? (
                          <p className="text-xs leading-5 text-[var(--color-muted)]">
                            {fieldReview.candidates[0].evidence}
                          </p>
                        ) : null}
                      </label>
                    );
                  })}
                </div>

                {reviewConflicts.length > 0 ? (
                  <div className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-sm leading-6 text-[var(--color-foreground)]">
                    <p className="font-medium">Conflicten tussen afbeeldingen</p>
                    <div className="mt-3 space-y-2 text-[var(--color-muted)]">
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
                  className="w-full rounded-[1rem] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
                >
                  Neem deze waarden over in het formulier
                </button>
              </div>
            ) : null}
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleIntakeSubmit}>
            <div className="grid gap-5">
              <FormSection
                title="Pand en marktcontext"
                description="Basisgegevens voor aankoopkost, OV en rendement."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
                    <span>Gewest</span>
                    <select
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

                  <label className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
                    <span>Aankoopsituatie</span>
                    <select
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

              <FormSection
                title="Rendement en exploitatie"
                description="Vuistregels worden alleen gebruikt als jij deze velden leeg laat."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {YIELD_FIELDS.map((config) =>
                    renderTextField(form, updateForm, config),
                  )}
                </div>
              </FormSection>

              <FormSection
                title="Financiering"
                description="Rente blijft altijd gebruikersinput. De marktindicatie hieronder is enkel context."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {FINANCING_FIELDS.map((config) =>
                    renderTextField(form, updateForm, config),
                  )}

                  <label className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
                    <span>Leningtype</span>
                    <select
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

                <div className="mt-4 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    Marktindicatie rentevoet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    Niet-bindende referentie op basis van{" "}
                    {ECB_MARKET_REFERENCE.sourceLabel}, laatste observatie{" "}
                    {ECB_MARKET_REFERENCE.lastObservation}.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                </div>
              </FormSection>

              <FormSection
                title="Fiscale en dossiernuances"
                description="Alleen invullen als je ze kent. Leeg laten is prima."
              >
                <div className="grid gap-4 md:grid-cols-2">
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
              </FormSection>
            </div>

            <label className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
              <span>Notities of context</span>
              <textarea
                className={`${inputClassName()} min-h-28 resize-y`}
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Bijvoorbeeld: opknapper, lift te vernieuwen, verkoper wil snel sluiten..."
              />
            </label>

            {error ? (
              <div className="rounded-[1rem] border border-[#E7C7C7] bg-[#FAEEEE] px-4 py-3 text-sm text-[var(--color-danger)]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={workspaceBusy || chatBusy}
              className="w-full rounded-[1rem] bg-[var(--color-primary)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {chatBusy
                ? "Analyse wordt gestreamd..."
                : activeConversation?.messages.length
                  ? "Werk deze chatanalyse bij"
                  : "Start analysechat"}
            </button>
          </form>
        </section>

        <section className={cardClassName()}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Chat
              </p>
              <h2 className="mt-3 font-[family:var(--font-display)] text-3xl text-[var(--color-foreground)]">
                {activeConversation?.summary.title ?? "Nieuwe analyse"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                Elke herberekening blijft als snapshot bewaard binnen hetzelfde
                gesprek, samen met de volledige conversatiehistoriek.
              </p>
            </div>
            <div className={mutedPillClassName()}>
              Status: {chatBusy ? "streaming" : latestResult?.status ?? "nog leeg"}
            </div>
          </div>

          {chatBusy ? (
            <div className="mt-5">
              <TypingIndicator label="Assistant denkt mee en herberekent waar nodig" />
            </div>
          ) : null}

          {latestResult ? (
            <div className="mt-6">
              <AnalysisResultsCard
                result={latestResult}
                form={form}
                enrichmentContext={currentEnrichmentContext}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] px-6 py-10 text-center">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                Vertel me over een pand
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-muted)]">
                Vul links enkele kerngegevens in of upload screenshots van een
                advertentie. De tool berekent wat al mogelijk is en opent daarna
                het gesprek met een onderbouwde eerste mening.
              </p>
              <button
                type="button"
                onClick={() =>
                  setComposer("Vertel me eerlijk wat je van dit pand vindt.")
                }
                className="mt-5 rounded-[1rem] bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
              >
                Voorbeeldvraag klaarzetten
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
            <div className="space-y-4">
              <div className="subtle-scrollbar max-h-[560px] space-y-4 overflow-y-auto pr-1">
                {displayedMessages.length > 0 ? (
                  displayedMessages.map((message) => {
                    const isAssistant = message.role === "assistant";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                      >
                        <article
                          className={`max-w-[92%] rounded-[1.4rem] px-5 py-4 ${
                            isAssistant
                              ? "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                              : "bg-[var(--color-primary)] text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p
                              className={`text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${
                                isAssistant ? "text-[var(--color-muted)]" : "text-white/68"
                              }`}
                            >
                              {isAssistant ? "Assistant" : "Gebruiker"}
                            </p>
                            <p
                              className={`text-xs ${
                                isAssistant ? "text-[var(--color-muted)]" : "text-white/68"
                              }`}
                            >
                              {message.pending
                                ? "nu bezig..."
                                : formatDateTime(message.createdAt)}
                            </p>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                            {message.content}
                          </p>
                          {message.pending && isAssistant ? (
                            <div className="mt-3">
                              <TypingIndicator label="Antwoord stroomt binnen" />
                            </div>
                          ) : null}
                        </article>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-5 py-6 text-center">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      Nieuwe chat
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      Deze analyse heeft nog geen berichten. Verstuur links je
                      eerste intake en de assistant opent het gesprek vanzelf.
                    </p>
                  </div>
                )}
              </div>

              <form
                className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4"
                onSubmit={handleComposerSubmit}
              >
                <label className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
                  <span>Vervolgvraag of wijziging</span>
                  <textarea
                    className={`${inputClassName()} min-h-28 resize-y`}
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    placeholder="Bijvoorbeeld: herbereken met 1.150 euro huur en zeg me eerlijk of dit nog steek houdt."
                  />
                </label>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-[var(--color-muted)]">
                    Maximaal een concrete vraag per beurt werkt hier het best.
                  </p>
                  <button
                    type="submit"
                    disabled={workspaceBusy || chatBusy || !composer.trim()}
                    className="rounded-[1rem] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:opacity-60"
                  >
                    {chatBusy ? "Stream bezig..." : "Verstuur in chat"}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <section className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                  Actuele issues en aandachtspunten
                </h3>
                <div className="mt-4">
                  <IssueList issues={latestResult?.issues ?? []} />
                </div>
              </section>

              {latestResult ? (
                <>
                  <section className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                      Notariskosten aankoopakte
                    </h3>
                    <div className="mt-4 space-y-3">
                      {latestResult.module1.notaryPurchaseAct.breakdown.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-4 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-[var(--color-foreground)]">
                              {item.label}
                            </p>
                            <p className="text-xs text-[var(--color-muted)]">
                              {item.kind === "estimate" ? "Raming" : "Exact"}
                            </p>
                          </div>
                          <p className="font-semibold text-[var(--color-foreground)]">
                            {formatCurrency(item.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                      Dossierdetails
                    </h3>
                    <div className="mt-4 grid gap-3">
                      <MetricBadge
                        label="Jaarlijkse nettohuur"
                        value={formatCurrency(latestResult.module3.jaarlijkseNettoHuur)}
                      />
                      <MetricBadge
                        label="Cash-on-cash"
                        value={formatPercentPoints(latestResult.module3.cashOnCash)}
                      />
                      <MetricBadge
                        label="Totale interest"
                        value={formatCurrency(latestResult.module4.totaleInterest)}
                      />
                      {latestResult.module5 ? (
                        <MetricBadge
                          label="REV na hefboom"
                          value={formatPercentPoints(
                            latestResult.module5.rev !== undefined
                              ? latestResult.module5.rev * 100
                              : undefined,
                          )}
                        />
                      ) : null}
                      {parseOptionalNumber(form.eigenInbreng) !== undefined ? (
                        <MetricBadge
                          label="Eigen inbreng ingevoerd"
                          value={formatCurrency(parseOptionalNumber(form.eigenInbreng))}
                        />
                      ) : null}
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceFrame>
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
    <section className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
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
    <div className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">
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
    <label className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
      <span>{label}</span>
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
