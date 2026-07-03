import { describe, expect, it } from "vitest";

import {
  berekenAankoopKostenModule1,
  berekenNotarisEreloonAankoop,
  berekenRegistratiebelasting,
} from "@/lib/calc-engine";

describe("module 1 - registratiebelasting", () => {
  it("berekent 12% voor een Vlaamse investering", () => {
    const result = berekenRegistratiebelasting({
      aankoopprijs: 300000,
      gewest: "vlaanderen",
      aankoopSituatie: "investering_of_tweede",
    });

    expect(result.applicableRate).toBe(0.12);
    expect(result.totalDue).toBe(36000);
  });

  it("past het Brusselse abattement toe tot 200.000 euro", () => {
    const result = berekenRegistratiebelasting({
      aankoopprijs: 400000,
      gewest: "brussel",
      aankoopSituatie: "enige_eigen_woning",
      kopersZijnUitsluitendNatuurlijkePersonen: true,
      verwervingInVolleEigendom: true,
      heeftAndereWoningInVolleEigendom: false,
    });

    expect(result.abatementAmount).toBe(200000);
    expect(result.totalDue).toBe(25000);
  });

  it("past in Vlaanderen de bijkomende vermindering voor een bescheiden woning toe", () => {
    const result = berekenRegistratiebelasting({
      aankoopprijs: 210000,
      gewest: "vlaanderen",
      aankoopSituatie: "enige_eigen_woning",
      authentiekeAkteDatum: "2026-02-14",
    });

    expect(result.applicableRate).toBe(0.02);
    expect(result.reductionAmount).toBe(1867);
    expect(result.totalDue).toBe(2333);
  });

  it("blijft conservatief op 3% als de datum van de authentieke akte ontbreekt", () => {
    const result = berekenRegistratiebelasting({
      aankoopprijs: 210000,
      gewest: "vlaanderen",
      aankoopSituatie: "enige_eigen_woning",
    });

    expect(result.applicableRate).toBe(0.03);
    expect(result.reductionAmount).toBeUndefined();
    expect(result.totalDue).toBe(6300);
    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          "authentieke_akte_datum_verplicht_enige_eigen_woning",
      ),
    ).toBe(true);
  });
});

describe("module 1 - notarisereloon", () => {
  it("berekent het Jbis-ereloon op basis van het tariefbesluit van 2026", () => {
    const result = berekenNotarisEreloonAankoop(250000, "Jbis");

    expect(result).toBe(2172);
  });

  it("geeft een gedeeltelijk totaal zolang uitgaven aan derden ontbreken", () => {
    const result = berekenAankoopKostenModule1({
      aankoopprijs: 250000,
      gewest: "vlaanderen",
      aankoopSituatie: "enige_eigen_woning",
      authentiekeAkteDatum: "2026-02-14",
      heeftAndereWoningInVolleEigendom: false,
    });

    expect(result.status).toBe("partial");
    expect(result.notaryPurchaseAct.totalKnown).toBe(4068.67);
    expect(result.totalExtraCostsKnown).toBe(9068.67);
    expect(result.totalExtraCostsWithEstimate).toBeUndefined();
  });

  it("werkt het totaal af zodra een raming van uitgaven aan derden is ingevuld", () => {
    const result = berekenAankoopKostenModule1({
      aankoopprijs: 250000,
      gewest: "vlaanderen",
      aankoopSituatie: "enige_eigen_woning",
      authentiekeAkteDatum: "2026-02-14",
      heeftAndereWoningInVolleEigendom: false,
      geschatteUitgavenAanDerdenExclBtw: 304,
    });

    expect(result.status).toBe("complete");
    expect(result.notaryPurchaseAct.totalWithEstimate).toBe(4436.51);
    expect(result.totalProjectBudgetWithEstimate).toBe(259436.51);
  });

  it("geeft schaal J en een missing-issue zolang de andere woningstatus niet expliciet false is", () => {
    const result = berekenAankoopKostenModule1({
      aankoopprijs: 250000,
      gewest: "vlaanderen",
      aankoopSituatie: "enige_eigen_woning",
      authentiekeAkteDatum: "2026-02-14",
      geschatteUitgavenAanDerdenExclBtw: 304,
    });

    expect(result.status).toBe("partial");
    expect(result.notaryPurchaseAct.honorariumScale).toBe("J");
    expect(
      result.issues.some(
        (issue) => issue.code === "jbis_andere_woning_status_verplicht",
      ),
    ).toBe(true);
  });

  it("documenteert het specifieke akttype voor recht op geschriften en overschrijving", () => {
    const result = berekenAankoopKostenModule1({
      aankoopprijs: 250000,
      gewest: "vlaanderen",
      aankoopSituatie: "enige_eigen_woning",
      authentiekeAkteDatum: "2026-02-14",
      heeftAndereWoningInVolleEigendom: false,
    });

    expect(
      result.sources.some(
        (source) =>
          source.url.includes("2022020909") &&
          source.label.includes("50 euro") &&
          source.label.includes("100 euro") &&
          source.label.includes("aankoopakte met hypothecaire overschrijving"),
      ),
    ).toBe(true);
    expect(
      result.sources.some(
        (source) =>
          source.url.includes("onroerend-goed-verkopen") &&
          source.label.includes("285 euro") &&
          source.label.includes("aankoopakte met hypothecaire overschrijving"),
      ),
    ).toBe(true);
  });
});
