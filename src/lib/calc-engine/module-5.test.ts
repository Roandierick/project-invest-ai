import { describe, expect, it } from "vitest";

import { berekenHefboomeffect } from "@/lib/calc-engine";

describe("module 5 - hefboomeffect", () => {
  it("berekent een positieve hefboom zodra RTV hoger ligt dan RVV", () => {
    const result = berekenHefboomeffect({
      rtv: 0.05,
      rvv: 0.03,
      vreemdVermogen: 200000,
      eigenVermogen: 100000,
    });

    expect(result.status).toBe("complete");
    expect(result.hefboomIsPositief).toBe(true);
    expect(result.verhoudingVreemdOpEigenVermogen).toBe(2);
    expect(result.rev).toBe(0.09);
    expect(result.verschilMetRtv).toBe(0.04);
  });

  it("geeft een expliciete warning zodra de hefboom negatief wordt", () => {
    const result = berekenHefboomeffect({
      rtv: 0.0211,
      rvv: 0.035,
      vreemdVermogen: 220000,
      eigenVermogen: 80000,
    });

    expect(result.status).toBe("complete");
    expect(result.hefboomIsPositief).toBe(false);
    expect(result.rev).toBeCloseTo(-0.0171, 4);
    expect(
      result.issues.some((issue) => issue.code === "hefboom_negatief"),
    ).toBe(true);
  });

  it("valt terug op partial wanneer kerninputs ontbreken", () => {
    const result = berekenHefboomeffect({
      vreemdVermogen: 220000,
      eigenVermogen: 80000,
    });

    expect(result.status).toBe("partial");
    expect(result.rev).toBeUndefined();
    expect(
      result.issues.some((issue) => issue.code === "hefboom_rtv_verplicht"),
    ).toBe(true);
  });
});
