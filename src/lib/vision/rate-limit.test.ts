import { describe, expect, it, vi } from "vitest";

import {
  consumeVisionExtractRateLimit,
  VISION_EXTRACT_RATE_LIMIT_MAX,
  VISION_EXTRACT_RATE_LIMIT_WINDOW_SECONDS,
} from "@/lib/vision/rate-limit";

describe("consumeVisionExtractRateLimit", () => {
  it("uses the configured quota window and maps the RPC response", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          allowed: true,
          remaining: 17,
          reset_at: "2026-07-03T11:00:00.000Z",
          request_count: 3,
        },
      ],
      error: null,
    });

    const result = await consumeVisionExtractRateLimit({ rpc } as never);

    expect(rpc).toHaveBeenCalledWith("consume_vision_extract_rate_limit", {
      max_requests: VISION_EXTRACT_RATE_LIMIT_MAX,
      window_seconds: VISION_EXTRACT_RATE_LIMIT_WINDOW_SECONDS,
    });
    expect(result).toEqual({
      allowed: true,
      remaining: 17,
      resetAt: "2026-07-03T11:00:00.000Z",
      requestCount: 3,
    });
  });
});
