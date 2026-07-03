export interface VlabelEnrichment {
  gemeenteNaam: string;
  nisCode: string;
  provincialeOpcentiemen: number;
  gemeentelijkeOpcentiemen: number;
  peildatum: string;
  bronUrl: string;
}

export interface StatbelEnrichment {
  mediaanVerkoopprijsAppartement?: number;
  mediaanVerkoopprijsWoonhuis?: number;
  jaar: number;
  peildatum: string;
  bronUrl: string;
  maatstaf: "mediaan";
}

export interface GeopuntEnrichment {
  overstromingsgevoelig: boolean | null;
  zone?: string;
  peildatum: string;
  bronUrl: string;
  benadering: "adres" | "gemeentecentrum";
  locatieLabel: string;
}

export interface EnrichmentContext {
  vlabel?: VlabelEnrichment;
  statbel?: StatbelEnrichment;
  geopunt?: GeopuntEnrichment;
}
