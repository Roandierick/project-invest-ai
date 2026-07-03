import { describe, expect, it } from "vitest";

import { berekenErfbelasting } from "@/lib/calc-engine";

describe("module 6 - erfbelasting", () => {
  it("past in Vlaanderen de vrijstelling op de gezinswoning en het partnerabattement op roerend toe", () => {
    const result = berekenErfbelasting({
      onroerendAandeel: 300000,
      roerendAandeel: 60000,
      verwantschap: "rechte_lijn_of_partner",
      gewest: "vlaanderen",
      isLangstlevendePartner: true,
      isGezinswoning: true,
    });

    expect(result.status).toBe("complete");
    expect(result.belastbareOnroerendeAandeel).toBe(0);
    expect(result.belastbareRoerendeAandeel).toBe(0);
    expect(result.totaleErfbelasting).toBe(0);
  });

  it("berekent in Brussel het progressieve tarief na het abattement in rechte lijn", () => {
    const result = berekenErfbelasting({
      onroerendAandeel: 150000,
      roerendAandeel: 50000,
      verwantschap: "rechte_lijn_of_partner",
      gewest: "brussel",
      isLangstlevendePartner: false,
      isGezinswoning: false,
    });

    expect(result.status).toBe("complete");
    expect(result.belastbareGrondslagTotaal).toBe(185000);
    expect(result.totaleErfbelasting).toBe(14050);
  });

  it("berekent in Wallonie het hogere tarief voor andere verkrijgers", () => {
    const result = berekenErfbelasting({
      onroerendAandeel: 80000,
      roerendAandeel: 20000,
      verwantschap: "anderen",
      gewest: "wallonie",
      isLangstlevendePartner: false,
      isGezinswoning: false,
    });

    expect(result.status).toBe("complete");
    expect(result.belastbareGrondslagTotaal).toBe(100000);
    expect(result.totaleErfbelasting).toBe(58125);
  });

  it("geeft partial terug voor Brusselse ooms/tantes/neven/nichten zonder groepsTotaal", () => {
    const result = berekenErfbelasting({
      onroerendAandeel: 70000,
      roerendAandeel: 30000,
      verwantschap: "oom_tante_neef_nicht",
      gewest: "brussel",
      isLangstlevendePartner: false,
      isGezinswoning: false,
    });

    expect(result.status).toBe("partial");
    expect(result.totaleErfbelasting).toBeUndefined();
    expect(
      result.issues.some(
        (issue) => issue.code === "erfbelasting_groeps_totaal_verplicht",
      ),
    ).toBe(true);
  });

  it("berekent in Brussel de pro-rata erfbelasting voor ooms/tantes/neven/nichten op groepsTotaal", () => {
    const result = berekenErfbelasting({
      onroerendAandeel: 70000,
      roerendAandeel: 30000,
      groepsTotaal: 200000,
      verwantschap: "oom_tante_neef_nicht",
      gewest: "brussel",
      isLangstlevendePartner: false,
      isGezinswoning: false,
    });

    expect(result.status).toBe("complete");
    expect(result.groepsTotaal).toBe(200000);
    expect(result.erfbelastingOpGroepsTotaal).toBe(105000);
    expect(result.proRataFactor).toBe(0.5);
    expect(result.totaleErfbelasting).toBe(52500);
  });

  it("berekent in Wallonie het aparte tarief voor ooms/tantes/neven/nichten op het individuele aandeel", () => {
    const result = berekenErfbelasting({
      onroerendAandeel: 70000,
      roerendAandeel: 30000,
      verwantschap: "oom_tante_neef_nicht",
      gewest: "wallonie",
      isLangstlevendePartner: false,
      isGezinswoning: false,
    });

    expect(result.status).toBe("complete");
    expect(result.groepsTotaal).toBeUndefined();
    expect(result.belastbareGrondslagTotaal).toBe(100000);
    expect(result.totaleErfbelasting).toBe(40625);
  });

  it("geeft partial terug als de kerninvoer ontbreekt", () => {
    const result = berekenErfbelasting({
      gewest: "vlaanderen",
    });

    expect(result.status).toBe("partial");
    expect(result.totaleErfbelasting).toBeUndefined();
    expect(
      result.issues.some(
        (issue) => issue.code === "erfbelasting_onroerend_aandeel_verplicht",
      ),
    ).toBe(true);
  });
});
