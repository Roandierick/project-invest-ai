import { describe, expect, it, vi } from "vitest";

import { emptyForm } from "@/lib/analysis/form";
import { ensureConversationSnapshot } from "@/lib/conversations/repository";

describe("ensureConversationSnapshot", () => {
  it("wraps the current form state before calling the snapshot RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          snapshot_id: "snap-1",
          version: 1,
          created: true,
        },
      ],
      error: null,
    });

    const result = await ensureConversationSnapshot(
      { rpc } as never,
      {
        conversationId: "conv-1",
        form: {
          ...emptyForm(),
          gemeente: "Gent",
          aankoopprijs: "285000",
        },
      },
    );

    expect(rpc).toHaveBeenCalledWith("ensure_conversation_snapshot", {
      target_conversation_id: "conv-1",
      input_data: {
        form: expect.objectContaining({
          gemeente: "Gent",
          aankoopprijs: "285000",
        }),
        enrichmentContext: null,
      },
    });
    expect(result).toEqual({
      snapshot_id: "snap-1",
      version: 1,
      created: true,
    });
  });
});
