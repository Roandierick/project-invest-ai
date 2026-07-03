import { describe, expect, it } from "vitest";

import { mergeImageExtractions } from "@/lib/vision/merge";
import { parseSingleImageExtraction } from "@/lib/vision/schema";

describe("vision schema", () => {
  it("valideert een volledige extraction payload", () => {
    const result = parseSingleImageExtraction({
      imageIndex: 0,
      prijs: { value: 315000, confidence: "high", evidence: "Vraagprijs €315.000" },
      postcode: { value: "9000", confidence: "high", evidence: "Adresregel toont 9000" },
      gemeente: { value: "Gent", confidence: "high", evidence: "Adresregel toont Gent" },
      pandtype: { value: "Appartement", confidence: "medium", evidence: "Titel advertentie" },
      oppervlakte: { value: 87, confidence: "high", evidence: "87 m2" },
      bouwjaar: { value: 1998, confidence: "medium", evidence: "Bouwjaar 1998" },
      nietGeindexeerdKi: { value: 745, confidence: "medium", evidence: "KI 745" },
      epcLabel: { value: "B", confidence: "high", evidence: "EPC B" },
      aantalSlaapkamers: { value: 2, confidence: "high", evidence: "2 slpks" },
      opmerkingen: "Prijs en EPC zijn duidelijk zichtbaar.",
    });

    expect(result.prijs.value).toBe(315000);
    expect(result.gemeente.value).toBe("Gent");
  });

  it("weigert ongeldige confidence-waarden", () => {
    expect(() =>
      parseSingleImageExtraction({
        imageIndex: 0,
        prijs: { value: 315000, confidence: "zeker", evidence: null },
        postcode: { value: null, confidence: "none", evidence: null },
        gemeente: { value: null, confidence: "none", evidence: null },
        pandtype: { value: null, confidence: "none", evidence: null },
        oppervlakte: { value: null, confidence: "none", evidence: null },
        bouwjaar: { value: null, confidence: "none", evidence: null },
        nietGeindexeerdKi: { value: null, confidence: "none", evidence: null },
        epcLabel: { value: null, confidence: "none", evidence: null },
        aantalSlaapkamers: { value: null, confidence: "none", evidence: null },
      }),
    ).toThrow();
  });
});

describe("vision merge", () => {
  it("voorkomt stilzwijgend overschrijven bij conflicterende waardes", () => {
    const merged = mergeImageExtractions([
      parseSingleImageExtraction({
        imageIndex: 0,
        prijs: { value: 315000, confidence: "high", evidence: "Vraagprijs €315.000" },
        postcode: { value: "9000", confidence: "high", evidence: "Adresregel" },
        gemeente: { value: "Gent", confidence: "high", evidence: "Adresregel" },
        pandtype: { value: "Appartement", confidence: "medium", evidence: "Titel" },
        oppervlakte: { value: 87, confidence: "high", evidence: "87 m2" },
        bouwjaar: { value: null, confidence: "none", evidence: null },
        nietGeindexeerdKi: { value: 745, confidence: "medium", evidence: "KI 745" },
        epcLabel: { value: "B", confidence: "high", evidence: "EPC B" },
        aantalSlaapkamers: { value: 2, confidence: "high", evidence: "2 slpks" },
      }),
      parseSingleImageExtraction({
        imageIndex: 1,
        prijs: { value: 319000, confidence: "medium", evidence: "Vraagprijs €319.000" },
        postcode: { value: "9000", confidence: "high", evidence: "Adresregel" },
        gemeente: { value: "Gent", confidence: "high", evidence: "Adresregel" },
        pandtype: { value: "Appartement", confidence: "high", evidence: "Titel" },
        oppervlakte: { value: 87, confidence: "medium", evidence: "87 m2" },
        bouwjaar: { value: 1998, confidence: "medium", evidence: "Bouwjaar 1998" },
        nietGeindexeerdKi: { value: null, confidence: "none", evidence: null },
        epcLabel: { value: "A", confidence: "low", evidence: "EPC-samenvatting" },
        aantalSlaapkamers: { value: 2, confidence: "high", evidence: "2 slaapkamers" },
      }),
    ]);

    expect(merged.suggestedFormPatch.aankoopprijs).toBe("315000");
    expect(merged.fields.prijs.hasConflict).toBe(true);
    expect(merged.fields.epcLabel.hasConflict).toBe(true);
    expect(merged.conflicts.map((conflict) => conflict.field)).toEqual([
      "prijs",
      "epcLabel",
    ]);
  });
});
