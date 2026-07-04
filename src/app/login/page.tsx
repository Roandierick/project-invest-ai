import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/persistent-analysis-workspace";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  await connection();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/");
    }
  } catch {
    // Laat de loginpagina renderen als Supabase server-side niet bruikbaar is.
  }

  return <AuthPanel />;
}
