import { describe, expect, it } from "vitest";

import { berekenLening } from "@/lib/calc-engine";

describe("module 4 - lening", () => {
  it("berekent maandlast, totale interest en eerstejaarsinterest met de annuiteitenformule", () => {
    const result = berekenLening({
      geleendBedrag: 240000,
      jaarlijkseRente: 0.035,
      looptijdJaren: 20,
      type: "vast",
    });

    expect(result.status).toBe("complete");
    expect(result.maandlast).toBe(1391.9);
    expect(result.totaleInterest).toBe(94056);
    expect(result.eersteJaarInterest).toBe(8265.51);
  });

  it("waarschuwt wanneer een investeringsdossier boven 80 procent quotiteit zit", () => {
    const result = berekenLening({
      geleendBedrag: 220000,
      jaarlijkseRente: 0.034,
      looptijdJaren: 20,
      type: "vast",
      aankoopprijs: 250000,
      aankoopSituatie: "investering_of_tweede",
    });

    expect(result.quotiteitCheck?.ltv).toBe(88);
    expect(result.quotiteitCheck?.richtlijnMax).toBe(80);
    expect(result.quotiteitCheck?.voldoetAanRichtlijn).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "lening_hoge_quotiteit"),
    ).toBe(true);
  });

  it("toont een niet-blokkerende DSTI-check als inkomen en huishoudsituatie ingevuld zijn", () => {
    const result = berekenLening({
      geleendBedrag: 240000,
      jaarlijkseRente: 0.035,
      looptijdJaren: 20,
      type: "vast",
      nettoMaandinkomen: 3200,
      alleenstaand: true,
      aantalKinderenTenLaste: 1,
    });

    expect(result.dstiCheck?.dsti).toBe(43.5);
    expect(result.dstiCheck?.grensPercentage).toBe(50);
    expect(result.dstiCheck?.haalbaar).toBe(true);
  });

  it("geeft partial terug als kerngegevens van de lening ontbreken", () => {
    const result = berekenLening({
      geleendBedrag: 240000,
      type: "vast",
    });

    expect(result.status).toBe("partial");
    expect(result.maandlast).toBeUndefined();
  });
});
