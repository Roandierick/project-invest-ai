"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createConversation } from "@/lib/conversations/repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface StartAnalysisButtonProps {
  currentUserId?: string;
  className?: string;
}

export function StartAnalysisButton({
  currentUserId,
  className,
}: StartAnalysisButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!currentUserId) {
      router.push("/");
      return;
    }

    setBusy(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const conversation = await createConversation(supabase, currentUserId);
      router.push(`/?conversation=${conversation.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy}
      className={
        className ??
        "rounded-[1rem] bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:opacity-60"
      }
    >
      {busy ? "Nieuwe chat openen..." : "Start een analyse"}
    </button>
  );
}
