import type {
  AankoopSituatie,
  CalculationIssue,
  Gewest,
  Module1Result,
  Module2Result,
  Module3Result,
  Module4Result,
  Module5Result,
  Module6Result,
  LeningType,
  SourceReference,
  Verwantschap,
} from "@/lib/calc-engine";
import type { EnrichmentContext } from "@/lib/enrichment/types";

export type BooleanChoice = "" | "true" | "false";
export type GewestChoice = "" | Gewest;
export type AankoopSituatieChoice = "" | AankoopSituatie;
export type VerwantschapChoice = "" | Verwantschap;

export interface AnalysisFormState {
  aankoopprijs: string;
  postcode: string;
  gemeente: string;
  gemeenteNisCode: string;
  pandtype: string;
  oppervlakte: string;
  bouwjaar: string;
  nietGeindexeerdKi: string;
  epcLabel: string;
  aantalSlaapkamers: string;
  maandelijkseHuur: string;
  onderhoudsPercentage: string;
  leegstandMaanden: string;
  verzekeringJaarlijks: string;
  syndicusVmeJaarlijks: string;
  beheerkostenJaarlijks: string;
  eigenInbreng: string;
  jaarlijkseFinancieringslasten: string;
  geleendBedrag: string;
  jaarlijkseRente: string;
  looptijdJaren: string;
  leningType: "" | LeningType;
  nettoMaandinkomen: string;
  alleenstaand: BooleanChoice;
  gewest: GewestChoice;
  aankoopSituatie: AankoopSituatieChoice;
  compromisDatum: string;
  authentiekeAkteDatum: string;
  kopersZijnUitsluitendNatuurlijkePersonen: BooleanChoice;
  verwervingInVolleEigendom: BooleanChoice;
  heeftAndereWoningInVolleEigendom: BooleanChoice;
  verkooptAndereWoningBinnenTolerantie: BooleanChoice;
  ligtInKernstadOfVlaamseRand: BooleanChoice;
  geschatteUitgavenAanDerdenExclBtw: string;
  isEigenWoningVanEigenaar: BooleanChoice;
  kinderenTenLaste: string;
  invaliditeit: BooleanChoice;
  eigenaarOuderDan70: BooleanChoice;
  erfbelastingOnroerendAandeel: string;
  erfbelastingRoerendAandeel: string;
  erfbelastingGroepsTotaal: string;
  erfbelastingVerwantschap: VerwantschapChoice;
  erfbelastingGewest: GewestChoice;
  erfbelastingIsLangstlevendePartner: BooleanChoice;
  erfbelastingIsGezinswoning: BooleanChoice;
  notes: string;
}

export interface OpeningContext {
  aankoopprijs?: number;
  pandtype?: string;
  gemeente?: string;
  maandelijkseHuur?: number;
}

export interface BaselineAnalysisResult {
  status: "complete" | "partial";
  module1: Module1Result;
  module2: Module2Result;
  module3: Module3Result;
  module4: Module4Result;
  module5?: Module5Result;
  module6?: Module6Result;
  issues: CalculationIssue[];
  sources: SourceReference[];
}

export interface StoredAnalysisInputData {
  form: AnalysisFormState;
  enrichmentContext?: EnrichmentContext | null;
}
