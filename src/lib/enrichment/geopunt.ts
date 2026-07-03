import type { AnalysisFormState } from "@/lib/analysis/types";
import type { GeopuntEnrichment } from "@/lib/enrichment/types";

const GEOLOCATION_API_URL =
  "https://geo.api.vlaanderen.be/geolocation/v4/Location";
const WATERINFO_INFO_URL = "https://www.waterinfo.be/informatieplicht";
const WATERINFO_RISICOZONES_LAYER_URL =
  "https://inspirepub.waterinfo.be/arcgis/rest/services/Risicozones_overstroming_2017/MapServer/3/query";
const WATERINFO_OEVERZONES_LAYER_URL =
  "https://inspirepub.waterinfo.be/arcgis/rest/services/Afgebakende_overstromingsgebieden_en_oeverzones/MapServer/0/query";
const WATERINFO_SIGNAALGEBIEDEN_LAYER_URL =
  "https://inspirepub.waterinfo.be/arcgis/rest/services/Signaalgebieden/MapServer/0/query";

interface GeolocationLocation {
  Lat_WGS84: number;
  Lon_WGS84: number;
}

interface GeolocationResult {
  FormattedAddress?: string;
  Municipality?: string;
  Zipcode?: string;
  Thoroughfarename?: string;
  Housenumber?: string;
  LocationType?: string;
  Location?: GeolocationLocation;
}

interface GeolocationResponse {
  LocationResult?: GeolocationResult[];
}

interface ArcGisQueryFeature {
  attributes?: Record<string, unknown>;
}

interface ArcGisQueryResponse {
  features?: ArcGisQueryFeature[];
}

function buildLocationQuery(form: AnalysisFormState): string | null {
  const gemeente = form.gemeente.trim();
  const postcode = form.postcode.trim();

  if (gemeente && postcode) {
    return `${gemeente} ${postcode}`;
  }

  if (gemeente) {
    return gemeente;
  }

  if (postcode) {
    return postcode;
  }

  return null;
}

function deriveApproximationMode(
  result: GeolocationResult,
): GeopuntEnrichment["benadering"] {
  if (result.LocationType?.includes("gemeente")) {
    return "gemeentecentrum";
  }

  if (!result.Thoroughfarename || !result.Housenumber) {
    return "gemeentecentrum";
  }

  return "adres";
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function queryArcGisLayer(
  url: string,
  point: GeolocationLocation,
  outFields = "*",
): Promise<ArcGisQueryResponse> {
  const params = new URLSearchParams({
    f: "json",
    geometry: `${point.Lon_WGS84},${point.Lat_WGS84}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields,
    returnGeometry: "false",
  });

  return fetchJson<ArcGisQueryResponse>(`${url}?${params.toString()}`);
}

function mapOeverzoneLabel(feature: ArcGisQueryFeature): string | null {
  const value = feature.attributes?.SRTTYPEID;

  if (value === 2 || value === "2") {
    return "IWB oeverzone";
  }

  if (value === 3 || value === "3") {
    return "IWB overstromingsgebied";
  }

  return "IWB watergebied";
}

function formatBelgianIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Brussels",
  }).format(date);
}

export async function fetchGeopuntOverstromingsContext(
  form: AnalysisFormState,
): Promise<GeopuntEnrichment | null> {
  const query = buildLocationQuery(form);

  if (!query) {
    return null;
  }

  try {
    const geolocation = await fetchJson<GeolocationResponse>(
      `${GEOLOCATION_API_URL}?${new URLSearchParams({
        q: query,
        c: "1",
      }).toString()}`,
    );
    const location = geolocation.LocationResult?.[0];

    if (!location?.Location) {
      return null;
    }

    const [risicozones, oeverzones, signaalgebieden] = await Promise.all([
      queryArcGisLayer(WATERINFO_RISICOZONES_LAYER_URL, location.Location),
      queryArcGisLayer(
        WATERINFO_OEVERZONES_LAYER_URL,
        location.Location,
        "SRTTYPEID",
      ),
      queryArcGisLayer(WATERINFO_SIGNAALGEBIEDEN_LAYER_URL, location.Location),
    ]);

    const labels = new Set<string>();

    if ((risicozones.features?.length ?? 0) > 0) {
      labels.add("Risicozone overstromingen 2017");
    }

    for (const feature of oeverzones.features ?? []) {
      const label = mapOeverzoneLabel(feature);

      if (label) {
        labels.add(label);
      }
    }

    if ((signaalgebieden.features?.length ?? 0) > 0) {
      labels.add("Signaalgebied");
    }

    return {
      overstromingsgevoelig: labels.size > 0 ? true : null,
      zone: labels.size > 0 ? Array.from(labels).join(", ") : undefined,
      peildatum: formatBelgianIsoDate(new Date()),
      bronUrl: WATERINFO_INFO_URL,
      benadering: deriveApproximationMode(location),
      locatieLabel:
        location.FormattedAddress ||
        [location.Municipality, location.Zipcode].filter(Boolean).join(" "),
    };
  } catch {
    return null;
  }
}
