"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function detectIosStandalone() {
  if (typeof window === "undefined") {
    return { isIos: false, isStandalone: false };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (typeof window.navigator === "object" &&
      "standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

  return { isIos, isStandalone };
}

interface InstallAppButtonProps {
  compact?: boolean;
}

export function InstallAppButton({ compact = false }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const { isIos, isStandalone } = useSyncExternalStore(
    () => () => undefined,
    detectIosStandalone,
    () => ({ isIos: false, isStandalone: false }),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) {
      return;
    }

    setBusy(true);

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } finally {
      setBusy(false);
    }
  }

  if (isStandalone || isIos || !deferredPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void handleInstallClick()}
      disabled={busy}
      className={
        compact
          ? "rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-primary)] transition hover:border-[var(--color-primary)] disabled:opacity-60"
          : "w-full rounded-[1rem] border border-white/18 bg-white/8 px-4 py-3 text-sm text-white transition hover:bg-white/12 disabled:opacity-60"
      }
    >
      {busy ? "Installeren..." : "Installeer als app"}
    </button>
  );
}
