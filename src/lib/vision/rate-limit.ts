import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type DatabaseClient = SupabaseClient<Database>;

export const VISION_EXTRACT_RATE_LIMIT_MAX = 20;
export const VISION_EXTRACT_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export interface VisionExtractRateLimitState {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  requestCount: number;
}

export async function consumeVisionExtractRateLimit(
  client: DatabaseClient,
): Promise<VisionExtractRateLimitState> {
  const { data, error } = await client.rpc("consume_vision_extract_rate_limit", {
    max_requests: VISION_EXTRACT_RATE_LIMIT_MAX,
    window_seconds: VISION_EXTRACT_RATE_LIMIT_WINDOW_SECONDS,
  });

  if (error) {
    throw error;
  }

  const row = data?.[0];

  if (!row) {
    throw new Error("Vision rate limiting returned no result.");
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: row.reset_at,
    requestCount: row.request_count,
  };
}
