import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  appendAnalysisSnapshot: vi.fn(),
  attachUploadsToSnapshot: vi.fn(),
  appendMessagePair: vi.fn(),
  berekenBasisAnalyse: vi.fn(),
  deriveTitle: vi.fn(),
}));

vi.mock("@/lib/conversations/repository", () => ({
  appendAnalysisSnapshot: mocked.appendAnalysisSnapshot,
  attachUploadsToSnapshot: mocked.attachUploadsToSnapshot,
  appendMessagePair: mocked.appendMessagePair,
}));

vi.mock("@/lib/analysis/calculate", () => ({
  berekenBasisAnalyse: mocked.berekenBasisAnalyse,
}));

vi.mock("@/lib/analysis/form", () => ({
  deriveTitle: mocked.deriveTitle,
}));

import { persistConversationTurn } from "@/lib/assistant/persist-turn";

describe("persistConversationTurn", () => {
  beforeEach(() => {
    mocked.appendAnalysisSnapshot.mockReset();
    mocked.attachUploadsToSnapshot.mockReset();
    mocked.appendMessagePair.mockReset();
    mocked.berekenBasisAnalyse.mockReset();
    mocked.deriveTitle.mockReset();
    mocked.deriveTitle.mockReturnValue("Analyse Gent");
    mocked.berekenBasisAnalyse.mockReturnValue({ status: "partial" });
    mocked.appendAnalysisSnapshot.mockResolvedValue({ snapshot_id: "snap-1" });
  });

  it("maakt een nieuwe snapshot aan wanneer een toolgedreven herberekening gebeurde", async () => {
    const enrichmentContext = {
      vlabel: {
        gemeenteNaam: "Gent",
        nisCode: "44021",
        provincialeOpcentiemen: 148.47,
        gemeentelijkeOpcentiemen: 1088,
        peildatum: "2026",
        bronUrl:
          "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/onroerende-voorheffing/berekening-van-de-onroerende-voorheffing",
      },
    };

    await persistConversationTurn({
      client: {} as never,
      conversationId: "conv-1",
      form: {
        aankoopprijs: "250000",
      } as never,
      enrichmentContext,
      userMessage: "Herbereken met 250.000 euro aankoopprijs.",
      assistantMessage: "Met die nieuwe aankoopprijs schuift je totale budget omhoog.",
      createSnapshot: true,
    });

    expect(mocked.appendAnalysisSnapshot).toHaveBeenCalledTimes(1);
    expect(mocked.appendAnalysisSnapshot).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        conversationId: "conv-1",
        title: "Analyse Gent",
        userMessage: "Herbereken met 250.000 euro aankoopprijs.",
        assistantMessage:
          "Met die nieuwe aankoopprijs schuift je totale budget omhoog.",
        enrichmentContext,
        calculatedResults: { status: "partial" },
      }),
    );
    expect(mocked.appendMessagePair).not.toHaveBeenCalled();
    expect(mocked.attachUploadsToSnapshot).not.toHaveBeenCalled();
  });

  it("koppelt geuploade storage-paden aan de nieuwe snapshot wanneer die meegegeven zijn", async () => {
    await persistConversationTurn({
      client: {} as never,
      conversationId: "conv-uploads",
      form: {
        gemeente: "Gent",
      } as never,
      userMessage: "Ik voeg nog screenshots toe.",
      assistantMessage: "Ik heb ze mee in de volgende snapshot opgenomen.",
      createSnapshot: true,
      uploadedStoragePaths: [
        "user-1/conv-uploads/file-a.png",
        "user-1/conv-uploads/file-b.png",
      ],
    });

    expect(mocked.attachUploadsToSnapshot).toHaveBeenCalledTimes(1);
    expect(mocked.attachUploadsToSnapshot).toHaveBeenCalledWith({}, {
      snapshotId: "snap-1",
      storagePaths: [
        "user-1/conv-uploads/file-a.png",
        "user-1/conv-uploads/file-b.png",
      ],
    });
  });

  it("bewaart een gewone user/assistant-uitwisseling zonder snapshot wanneer er niet herberekend werd", async () => {
    await persistConversationTurn({
      client: {} as never,
      conversationId: "conv-2",
      form: {
        gemeente: "Gent",
      } as never,
      userMessage: "Waarom is de netto-opbrengst hier zwak?",
      assistantMessage:
        "Vooral de combinatie van instapkost en terugkerende kosten drukt hier het rendement.",
      createSnapshot: false,
    });

    expect(mocked.appendMessagePair).toHaveBeenCalledTimes(1);
    expect(mocked.appendMessagePair).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        conversationId: "conv-2",
        title: "Analyse Gent",
      }),
    );
    expect(mocked.appendAnalysisSnapshot).not.toHaveBeenCalled();
    expect(mocked.attachUploadsToSnapshot).not.toHaveBeenCalled();
  });
});
