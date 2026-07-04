import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const redirectUrl = new URL("/", request.url);
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  } catch {
    // Laat de gebruiker altijd terug landen op de homepage.
  }

  return NextResponse.redirect(redirectUrl);
}
