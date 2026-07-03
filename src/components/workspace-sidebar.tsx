"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InstallAppButton } from "@/components/install-app-button";
import {
  createConversation,
  type ConversationSummary,
} from "@/lib/conversations/repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

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
  description: string;
}> = [
  {
    key: "analyse",
    href: "/",
    label: "Analyse",
    description: "Chatflow en rekenmodules",
  },
  {
    key: "investeerders",
    href: "/investeerders",
    label: "Investeerders",
    description: "Profielen en valkuilen",
  },
  {
    key: "strategieen",
    href: "/strategieen",
    label: "Strategieen",
    description: "Vastgoedaanpakken in Belgie",
  },
  {
    key: "optimalisatie",
    href: "/optimalisatie",
    label: "Optimalisatie",
    description: "Structuur, fiscus en overdracht",
  },
];

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
      const supabase = getSupabaseBrowserClient();
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
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <aside
      className={`flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] bg-[var(--color-primary)] text-white ${className ?? ""}`}
    >
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/58">
              Project Invest AI
            </p>
            <h1 className="mt-3 font-[family:var(--font-display)] text-2xl text-white">
              Analyseworkspace
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/72">
              {isAuthenticated
                ? `Ingelogd als ${currentUserEmail ?? "onbekend e-mailadres"}.`
                : "Publieke gidsen over strategie, profielen en optimalisatie zonder login."}
            </p>
          </div>
          <div className="rounded-[1rem] bg-white/10 px-3 py-2 text-[0.72rem] text-white/76">
            {conversations.length} analyses
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleNewConversation()}
          disabled={disabled}
          className="mt-5 inline-flex w-full items-center justify-center rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[#F3F6FA] disabled:opacity-60"
        >
          {isAuthenticated ? "Nieuwe analyse" : "Inloggen om te starten"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/54">
              Chatgeschiedenis
            </p>
            {busy ? (
              <span className="text-[0.68rem] text-white/54">Bezig met laden</span>
            ) : null}
          </div>

          <div className="subtle-scrollbar mt-4 max-h-full space-y-3 overflow-y-auto pr-1">
            {busy ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`sidebar-skeleton-${index}`}
                  className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4"
                >
                  <div className="skeleton-line h-4 rounded-full bg-white/16" />
                  <div className="skeleton-line mt-3 h-3 w-24 rounded-full bg-white/12" />
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-white/72">
                Nog geen analyses - start er een.
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
                    className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-white/22 bg-white/14"
                        : "border-white/8 bg-white/5 hover:bg-white/9"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-white">
                      {conversation.title}
                    </p>
                    <p className="mt-2 text-xs text-white/58">
                      {formatDateTime(conversation.updatedAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/54">
            Navigatie
          </p>
          <div className="mt-3 space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === activeNav;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onNavigate}
                  className={`block rounded-[1rem] px-4 py-3 transition ${
                    isActive
                      ? "bg-white text-[var(--color-primary)]"
                      : "text-white/78 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-[var(--color-muted)]" : "text-white/52"
                    }`}
                  >
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <InstallAppButton />
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={disabled}
              className="rounded-full border border-white/16 px-3 py-2 text-sm text-white/84 transition hover:bg-white/8 disabled:opacity-60"
            >
              {isAuthenticated ? "Uitloggen" : "Inloggen"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
