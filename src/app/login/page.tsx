import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/persistent-analysis-workspace";
import { createClient } from "@/lib/supabase/server";

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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(resolvedSearchParams.next);
  await connection();

  try {
    const supabase = await createClient();
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
