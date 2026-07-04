import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export interface SupabaseSessionUpdateResult {
  response: NextResponse;
  userId: string | null;
  failed: boolean;
}

export async function updateSession(
  request: NextRequest,
): Promise<SupabaseSessionUpdateResult> {
  let response = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );

            response = NextResponse.next({
              request,
            });

            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      response,
      userId: user?.id ?? null,
      failed: false,
    };
  } catch {
    return {
      response: NextResponse.next({
        request,
      }),
      userId: null,
      failed: true,
    };
  }
}
