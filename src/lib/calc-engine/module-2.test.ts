import { describe, expect, it } from "vitest";

import { berekenOnroerendeVoorheffingVlaanderen } from "@/lib/calc-engine";

describe("module 2 - onroerende voorheffing", () => {
  it("reproduceert het officiele VLABEL-voorbeeld voor Aalst in aanslagjaar 2024", () => {
    const result = berekenOnroerendeVoorheffingVlaanderen({
      nietGeindexeerdKI: 720,
      gemeenteNisCode: "41002",
      aanslagjaar: 2024,
      isEigenWoningVanEigenaar: false,
    });

    expect(result.status).toBe("complete");
    expect(result.aanslagjaar).toBe(2024);
    expect(result.geindexeerdKI).toBe(1567);
    expect(result.basisheffingAmount).toBe(62.21);
    expect(result.provincialeAmount).toBe(92.36);
    expect(result.gemeentelijkeAmount).toBe(587.26);
    expect(result.totalDue).toBe(741.83);
  });

  it("leidt aanslagjaar 2026 af uit een authentieke akte in 2025", () => {
    const result = berekenOnroerendeVoorheffingVlaanderen({
      nietGeindexeerdKI: 800,
      gemeenteNisCode: "31005",
      authentiekeAkteDatum: "2025-09-18",
      isEigenWoningVanEigenaar: false,
    });

    expect(result.status).toBe("complete");
    expect(result.aanslagjaar).toBe(2026);
    expect(result.gemeente).toBe("Brugge");
    expect(result.totalDue).toBe(945.1);
  });

  it("kan een gemeente ook rechtstreeks op naam koppelen als de NIS-code ontbreekt", () => {
    const result = berekenOnroerendeVoorheffingVlaanderen({
      nietGeindexeerdKI: 800,
      gemeenteNaam: "brugge",
      aanslagjaar: 2026,
      isEigenWoningVanEigenaar: false,
    });

    expect(result.status).toBe("complete");
    expect(result.gemeente).toBe("Brugge");
    expect(result.gemeenteNisCode).toBe("31005");
    expect(result.totalDue).toBe(945.1);
  });

  it("geeft een partial terug als de aktedatum naar een nog niet geverifieerd aanslagjaar wijst", () => {
    const result = berekenOnroerendeVoorheffingVlaanderen({
      nietGeindexeerdKI: 720,
      gemeenteNisCode: "41002",
      authentiekeAkteDatum: "2026-04-01",
      isEigenWoningVanEigenaar: false,
    });

    expect(result.status).toBe("partial");
    expect(result.aanslagjaar).toBe(2027);
    expect(result.totalDue).toBeUndefined();
    expect(
      result.issues.some((issue) => issue.code === "ov_aanslagjaar_niet_geverifieerd"),
    ).toBe(true);
  });

  it("blijft partial bij gedifferentieerde gemeentelijke opcentiemen en gokt niets", () => {
    const result = berekenOnroerendeVoorheffingVlaanderen({
      nietGeindexeerdKI: 900,
      gemeenteNisCode: "11002",
      aanslagjaar: 2026,
      isEigenWoningVanEigenaar: false,
    });

    expect(result.status).toBe("partial");
    expect(result.gemeente).toBe("Antwerpen");
    expect(result.totalDue).toBeUndefined();
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "ov_gemeente_gedifferentieerde_opcentiemen",
      ),
    ).toBe(true);
  });

  it("past de actuele forfaitaire vermindering voor minstens twee kinderen toe", () => {
    const result = berekenOnroerendeVoorheffingVlaanderen({
      nietGeindexeerdKI: 720,
      gemeenteNisCode: "41002",
      aanslagjaar: 2026,
      isEigenWoningVanEigenaar: true,
      kinderenTenLaste: 2,
    });

    expect(result.reductionAmount).toBe(209.87);
    expect(result.totalDue).toBe(574.06);
    expect(result.reductionsApplied).toHaveLength(1);
  });
});
