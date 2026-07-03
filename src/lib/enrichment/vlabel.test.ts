import { describe, expect, it } from "vitest";

import { lookupVlaamseOpcentiemen } from "@/lib/enrichment/vlabel";

describe("VLABEL lookup", () => {
  it("vindt een exacte gemeente via NIS-code", () => {
    const result = lookupVlaamseOpcentiemen({
      nisCode: "41002",
    });

    expect(result).toEqual({
      kind: "exact",
      matchedBy: "nis",
      record: {
        nisCode: "41002",
        gemeenteNaam: "Aalst",
        provincialeOpcentiemen: 148.47,
        gemeentelijkeOpcentiemen: 944,
        aanslagjaar: 2026,
      },
    });
  });

  it("valt case-insensitief terug op gemeentenaam", () => {
    const result = lookupVlaamseOpcentiemen({
      gemeenteNaam: "gEnT",
    });

    expect(result?.kind).toBe("exact");
    expect(result?.matchedBy).toBe("gemeente");
    expect(result?.record.gemeenteNaam).toBe("Gent");
    expect(result?.record.nisCode).toBe("44021");
  });

  it("merkt gemeenten met gedifferentieerde opcentiemen expliciet als zodanig", () => {
    const result = lookupVlaamseOpcentiemen({
      nisCode: "11002",
    });

    expect(result?.kind).toBe("differentiated");

    if (!result || result.kind !== "differentiated") {
      throw new Error("Expected a differentiated VLABEL lookup result.");
    }

    expect(result.matchedBy).toBe("nis");
    expect(result.record.gemeenteNaam).toBe("Antwerpen");
    expect(result.record.gemeentelijkeOpcentiemenOpties).toEqual([0, 850]);
  });

  it("geeft null terug voor een onbekende gemeente", () => {
    expect(
      lookupVlaamseOpcentiemen({
        gemeenteNaam: "Niet-Bestaand",
      }),
    ).toBeNull();
  });
});
