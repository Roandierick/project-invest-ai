import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

function normalizeNextPath(pathname: string, search: string): string {
  const candidate = `${pathname}${search}`;

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  return candidate;
}

export async function proxy(request: NextRequest) {
  try {
    const { response, userId, failed } = await updateSession(request);

    if (
      failed ||
      userId ||
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/auth/callback"
    ) {
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set(
      "next",
      normalizeNextPath(request.nextUrl.pathname, request.nextUrl.search),
    );

    const redirectResponse = NextResponse.redirect(loginUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  } catch {
    return NextResponse.next({
      request,
    });
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js)$).*)",
  ],
};
