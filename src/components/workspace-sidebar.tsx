"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InstallAppButton } from "@/components/install-app-button";
import {
  createConversation,
  type ConversationSummary,
} from "@/lib/conversations/repository";
import { createClient } from "@/lib/supabase/client";

export type WorkspaceNavKey =
  | "analyse"
  | "investeerders"
  | "strategieen"
  | "optimalisatie";

interface WorkspaceSidebarProps {
  currentUserEmail: string | null;
  currentUserId?: string;
  conversations: ConversationSummary[];
  activeConversationId?: string;
  activeNav: WorkspaceNavKey;
  busy?: boolean;
  className?: string;
  onNavigate?: () => void;
  onNewConversation?: () => void | Promise<void>;
  onSelectConversation?: (conversationId: string) => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
}

const NAV_ITEMS: Array<{
  key: WorkspaceNavKey;
  href: string;
  label: string;
}> = [
  {
    key: "analyse",
    href: "/",
    label: "Analyse",
  },
  {
    key: "investeerders",
    href: "/investeerders",
    label: "Investeerders",
  },
  {
    key: "strategieen",
    href: "/strategieen",
    label: "Strategieen",
  },
  {
    key: "optimalisatie",
    href: "/optimalisatie",
    label: "Optimalisatie",
  },
];

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function NavIcon({ itemKey }: { itemKey: WorkspaceNavKey }) {
  if (itemKey === "analyse") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19h16" />
        <path d="M7 16V9" />
        <path d="M12 16V5" />
        <path d="M17 16v-3" />
      </svg>
    );
  }

  if (itemKey === "investeerders") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 19a4 4 0 0 0-8 0" />
        <circle cx="12" cy="9" r="3" />
        <path d="M5 19a3 3 0 0 1 3-3" />
        <path d="M19 19a3 3 0 0 0-3-3" />
      </svg>
    );
  }

  if (itemKey === "strategieen") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7 3-7 3-7-3 7-3z" />
        <path d="M5 11l7 3 7-3" />
        <path d="M5 16l7 3 7-3" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

export function WorkspaceSidebar({
  currentUserEmail,
  currentUserId,
  conversations,
  activeConversationId,
  activeNav,
  busy = false,
  className,
  onNavigate,
  onNewConversation,
  onSelectConversation,
  onLogout,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const [localBusy, setLocalBusy] = useState(false);
  const disabled = busy || localBusy;
  const isAuthenticated = Boolean(currentUserId);

  async function handleNewConversation() {
    onNavigate?.();

    if (onNewConversation) {
      await onNewConversation();
      return;
    }

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    setLocalBusy(true);

    try {
      const supabase = createClient();
      const createdConversation = await createConversation(
        supabase,
        currentUserId,
      );
      router.push(`/?conversation=${createdConversation.id}`);
    } finally {
      setLocalBusy(false);
    }
  }

  async function handleSelectConversation(conversationId: string) {
    onNavigate?.();

    if (onSelectConversation) {
      await onSelectConversation(conversationId);
      return;
    }

    router.push(`/?conversation=${conversationId}`);
  }

  async function handleLogout() {
    onNavigate?.();

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (onLogout) {
      await onLogout();
      return;
    }

    setLocalBusy(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <aside
      className={`flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-[#242424] bg-[#171717] text-[var(--color-foreground)] ${className ?? ""}`}
    >
      <div className="border-b border-white/6 px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-white/40">
              Project Invest AI
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              Analyseworkspace
            </p>
            <p className="mt-1 truncate text-xs text-white/52">
              {isAuthenticated
                ? currentUserEmail ?? "Ingelogde gebruiker"
                : "Publieke gidsen en analysechat"}
            </p>
          </div>
          <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[0.68rem] text-white/58">
            {conversations.length}
          </div>
        </div>

        <nav className="mt-4 grid grid-cols-2 gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeNav;

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-[0.95rem] border px-3 py-2.5 text-xs font-medium transition ${
                  isActive
                    ? "border-[rgba(27,58,92,0.75)] bg-[rgba(27,58,92,0.36)] text-white"
                    : "border-white/8 bg-white/[0.02] text-white/68 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "bg-[var(--color-surface)] text-white/70"
                  }`}
                >
                  <NavIcon itemKey={item.key} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => void handleNewConversation()}
          disabled={disabled}
          className="mt-4 inline-flex w-full items-center justify-center rounded-[1rem] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(27,58,92,0.34)] transition hover:bg-[var(--color-primary-strong)] disabled:opacity-60"
        >
          {isAuthenticated ? "Nieuwe analyse" : "Inloggen om te starten"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/42">
            Chatgeschiedenis
          </p>
          {busy ? (
            <span className="text-[0.68rem] text-white/42">Laden...</span>
          ) : null}
        </div>

        <div className="subtle-scrollbar mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {busy ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`sidebar-skeleton-${index}`}
                className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-4"
              >
                <div className="skeleton-line h-4 rounded-full" />
                <div className="skeleton-line mt-3 h-3 w-24 rounded-full" />
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="rounded-[1.15rem] border border-dashed border-white/8 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/58">
              Nog geen analyses. Start er eentje en de chat verschijnt hier
              automatisch.
            </div>
          ) : (
            conversations.map((conversation) => {
              const isActive =
                activeNav === "analyse" &&
                conversation.id === activeConversationId;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void handleSelectConversation(conversation.id)}
                  disabled={disabled}
                  className={`w-full rounded-[1.1rem] border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-[rgba(27,58,92,0.72)] bg-[rgba(27,58,92,0.22)]"
                      : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-white">
                    {conversation.title}
                  </p>
                  <p className="mt-2 text-xs text-white/44">
                    {formatDateTime(conversation.updatedAt)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-white/6 px-3 py-3">
        <div className="space-y-2">
          <InstallAppButton />
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={disabled}
            className="w-full rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/82 transition hover:bg-white/[0.06] disabled:opacity-60"
          >
            {isAuthenticated ? "Uitloggen" : "Inloggen"}
          </button>
        </div>
      </div>
    </aside>
  );
}
