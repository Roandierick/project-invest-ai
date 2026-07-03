import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export interface SupabaseSessionUpdateResult {
  response: NextResponse;
  userId: string | null;
  failed: boolean;
}

export async function updateSupabaseSession(
  request: NextRequest,
): Promise<SupabaseSessionUpdateResult> {
  if (!isSupabaseConfigured()) {
    return {
      response: NextResponse.next({
        request,
      }),
      userId: null,
      failed: false,
    };
  }

  let response = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
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
    });

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
