"use client";

import { useState } from "react";

import {
  WorkspaceSidebar,
  type WorkspaceNavKey,
} from "@/components/workspace-sidebar";
import type { ConversationSummary } from "@/lib/conversations/repository";

interface WorkspaceFrameProps {
  currentUserEmail: string | null;
  currentUserId?: string;
  conversations: ConversationSummary[];
  activeConversationId?: string;
  activeNav: WorkspaceNavKey;
  busy?: boolean;
  topbar?: React.ReactNode;
  onNewConversation?: () => void | Promise<void>;
  onSelectConversation?: (conversationId: string) => void | Promise<void>;
  onDeleteConversation?: (conversationId: string) => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
  children: React.ReactNode;
}

const NAV_LABELS: Record<WorkspaceNavKey, string> = {
  analyse: "Analyse",
  investeerders: "Investeerders",
  strategieen: "Strategieen",
  optimalisatie: "Optimalisatie",
};

export function WorkspaceFrame({
  currentUserEmail,
  currentUserId,
  conversations,
  activeConversationId,
  activeNav,
  busy = false,
  topbar,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onLogout,
  children,
}: WorkspaceFrameProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1580px] gap-6 px-4 py-4 md:px-6 md:py-6">
        <div className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-6 h-[calc(100vh-3rem)]">
            <WorkspaceSidebar
              currentUserEmail={currentUserEmail}
              currentUserId={currentUserId}
              conversations={conversations}
              activeConversationId={activeConversationId}
              activeNav={activeNav}
              busy={busy}
              onNavigate={() => setSidebarOpen(false)}
              onNewConversation={onNewConversation}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              onLogout={onLogout}
              className="h-full"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[rgba(33,33,33,0.92)] px-4 py-3 shadow-[0_18px_38px_rgba(0,0,0,0.24)] backdrop-blur lg:hidden">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Project Invest AI
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {NAV_LABELS[activeNav]}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] transition hover:border-[var(--color-primary)] hover:text-white"
              aria-label="Open navigatie"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </button>
          </header>

          {topbar}
          <div className="min-w-0">{children}</div>
        </div>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.58)] lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 h-full w-full"
            aria-label="Sluit navigatie"
          />

          <div className="relative ml-auto h-full w-full max-w-[22rem] p-3">
            <WorkspaceSidebar
              currentUserEmail={currentUserEmail}
              currentUserId={currentUserId}
              conversations={conversations}
              activeConversationId={activeConversationId}
              activeNav={activeNav}
              busy={busy}
              onNavigate={() => setSidebarOpen(false)}
              onNewConversation={onNewConversation}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              onLogout={onLogout}
              className="h-full shadow-[0_24px_54px_rgba(0,0,0,0.38)]"
            />

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-[rgba(0,0,0,0.38)] text-white"
              aria-label="Sluit menu"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
