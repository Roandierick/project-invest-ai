import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emptyForm } from "@/lib/analysis/form";
import { fetchGeopuntOverstromingsContext } from "@/lib/enrichment/geopunt";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("Geopunt overstromingscontext", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bouwt een enrichment-context op bij een geslaagde geocoder- en zonecall", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          LocationResult: [
            {
              FormattedAddress: "9000 Gent",
              Municipality: "Gent",
              Zipcode: "9000",
              LocationType: "Gemeente",
              Location: {
                Lat_WGS84: 51.0543,
                Lon_WGS84: 3.7174,
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          features: [{ attributes: { OBJECTID: 1 } }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          features: [],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          features: [],
        }),
      );

    const result = await fetchGeopuntOverstromingsContext({
      ...emptyForm(),
      gemeente: "Gent",
      postcode: "9000",
    });

    expect(result).toEqual(
      expect.objectContaining({
        overstromingsgevoelig: true,
        zone: "Risicozone overstromingen 2017",
        bronUrl: "https://www.waterinfo.be/informatieplicht",
        benadering: "gemeentecentrum",
        locatieLabel: "9000 Gent",
      }),
    );
    expect(result?.peildatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "https://geo.api.vlaanderen.be/geolocation/v4/Location",
    );
  });

  it("geeft null terug als de externe bron faalt", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "down" }, 503));

    const result = await fetchGeopuntOverstromingsContext({
      ...emptyForm(),
      gemeente: "Gent",
      postcode: "9000",
    });

    expect(result).toBeNull();
  });

  it("doet geen externe call zonder locatie-input", async () => {
    const result = await fetchGeopuntOverstromingsContext(emptyForm());

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
