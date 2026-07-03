import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/persistent-analysis-workspace";
import { shouldShowSupabaseSetupNotice } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface LoginPageProps {
  searchParams?: Promise<{
    next?: string;
  }>;
}

function normalizeNextPath(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function SupabaseSetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-8 md:px-6">
      <section className="app-shell-card rounded-[1.75rem] p-8 text-[var(--color-foreground)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
          Setup vereist
        </p>
        <h1 className="mt-4 font-[family:var(--font-display)] text-4xl leading-tight">
          Supabase env vars ontbreken nog
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
          Vul eerst `NEXT_PUBLIC_SUPABASE_URL` en
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` in je `.env.local` in. Daarna werkt
          ook de loginroute automatisch mee.
        </p>
      </section>
    </main>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(resolvedSearchParams.next);
  await connection();

  if (shouldShowSupabaseSetupNotice()) {
    return <SupabaseSetupNotice />;
  }

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(nextPath);
    }
  } catch {
    // Laat de loginpagina renderen als Supabase server-side niet bruikbaar is.
  }

  return <AuthPanel nextPath={nextPath} />;
}
