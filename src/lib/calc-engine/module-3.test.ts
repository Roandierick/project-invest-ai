import { describe, expect, it } from "vitest";

import { berekenRendement } from "@/lib/calc-engine";

describe("module 3 - rendement", () => {
  it("berekent BAR, NAR en cash-on-cash met Belgische vuistregels", () => {
    const result = berekenRendement({
      aankoopprijs: 250000,
      aankoopkosten: 35000,
      maandelijkseHuur: 1100,
      bouwjaar: 1978,
      jaarlijkseOV: 900,
      verzekeringJaarlijks: 250,
      syndicusVmeJaarlijks: 1200,
      eigenInbreng: 80000,
      jaarlijkseFinancieringslasten: 5200,
    });

    expect(result.status).toBe("complete");
    expect(result.totaleInvestering).toBe(285000);
    expect(result.onderhoudsPercentageGebruikt).toBe(0.015);
    expect(result.bar).toBe(4.63);
    expect(result.nar).toBe(2.11);
    expect(result.cashOnCash).toBe(1);
  });

  it("valt terug op partial zodra de huur ontbreekt", () => {
    const result = berekenRendement({
      aankoopprijs: 250000,
      aankoopkosten: 35000,
    });

    expect(result.status).toBe("partial");
    expect(result.bar).toBeUndefined();
    expect(
      result.issues.some((issue) => issue.code === "rendement_huur_verplicht"),
    ).toBe(true);
  });

  it("gebruikt 1 procent onderhoud wanneer het pand niet als oud gedetecteerd wordt", () => {
    const result = berekenRendement({
      aankoopprijs: 300000,
      aankoopkosten: 40000,
      maandelijkseHuur: 1250,
      bouwjaar: 2015,
      jaarlijkseOV: 850,
    });

    expect(result.onderhoudsPercentageGebruikt).toBe(0.01);
    expect(result.onderhoudsKosten).toBe(3000);
  });
});
