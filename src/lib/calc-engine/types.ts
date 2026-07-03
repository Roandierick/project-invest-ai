export type Gewest = "vlaanderen" | "brussel" | "wallonie";

export type AankoopSituatie =
  | "enige_eigen_woning"
  | "investering_of_tweede"
  | "beroepsverkoper"
  | "ingrijpende_energetische_renovatie"
  | "beschermd_monument";

export type IssueLevel = "missing" | "warning" | "info";

export interface CalculationIssue {
  code: string;
  level: IssueLevel;
  message: string;
}

export interface SourceReference {
  label: string;
  url: string;
  verifiedAt: string;
}

export interface CostLineItem {
  label: string;
  amount: number;
  kind: "exact" | "estimate";
}

export interface Module1Input {
  aankoopprijs?: number;
  belastbareGrondslag?: number;
  gewest?: Gewest;
  aankoopSituatie?: AankoopSituatie;
  compromisDatum?: string;
  authentiekeAkteDatum?: string;
  kopersZijnUitsluitendNatuurlijkePersonen?: boolean;
  verwervingInVolleEigendom?: boolean;
  heeftAndereWoningInVolleEigendom?: boolean;
  verkooptAndereWoningBinnenTolerantie?: boolean;
  ligtInKernstadOfVlaamseRand?: boolean;
  geschatteUitgavenAanDerdenExclBtw?: number;
}

export interface RegistrationTaxResult {
  taxBase?: number;
  applicableRate?: number;
  amount?: number;
  reductionAmount?: number;
  abatementAmount?: number;
  totalDue?: number;
  ruleLabel?: string;
  conditions: string[];
  assumptions: string[];
  issues: CalculationIssue[];
}

export interface NotaryPurchaseActResult {
  honorariumScale?: "J" | "Jbis";
  honorariumExclVat?: number;
  administrativeFeeExclVat?: number;
  writingDutyExclVat?: number;
  transcriptionFee?: number;
  estimatedThirdPartyCostsExclVat?: number;
  vat?: number;
  totalKnown?: number;
  totalWithEstimate?: number;
  assumptions: string[];
  issues: CalculationIssue[];
  breakdown: CostLineItem[];
}

export interface Module1Result {
  status: "complete" | "partial";
  registrationTax: RegistrationTaxResult;
  notaryPurchaseAct: NotaryPurchaseActResult;
  totalExtraCostsKnown?: number;
  totalExtraCostsWithEstimate?: number;
  totalProjectBudgetKnown?: number;
  totalProjectBudgetWithEstimate?: number;
  issues: CalculationIssue[];
  sources: SourceReference[];
}

export interface OVInput {
  nietGeindexeerdKI?: number;
  gemeenteNisCode?: string;
  gemeenteNaam?: string;
  isEigenWoningVanEigenaar?: boolean;
  kinderenTenLaste?: number;
  invaliditeit?: boolean;
  eigenaarOuderDan70?: boolean;
  aanslagjaar?: number;
  authentiekeAkteDatum?: string;
}

export interface OpcentiemenPerGemeente {
  nisCode: string;
  gemeenteNaam: string;
  provincialeOpcentiemen: number;
  gemeentelijkeOpcentiemen: number;
  aanslagjaar: number;
}

export interface OVReductionLineItem {
  label: string;
  baseAmount: number;
  provincialIncrease: number;
  municipalIncrease: number;
  totalAmount: number;
}

export interface Module2Result {
  status: "complete" | "partial";
  aanslagjaar?: number;
  indexatiecoefficient?: number;
  basisheffingRate?: number;
  gemeente?: string;
  gemeenteNisCode?: string;
  geindexeerdKI?: number;
  basisheffingAmount?: number;
  provincialeOpcentiemen?: number;
  provincialeAmount?: number;
  gemeentelijkeOpcentiemen?: number;
  gemeentelijkeAmount?: number;
  brutoOnroerendeVoorheffing?: number;
  reductionAmount?: number;
  totalDue?: number;
  reductionsApplied: OVReductionLineItem[];
  assumptions: string[];
  issues: CalculationIssue[];
  sources: SourceReference[];
}

export interface RendementInput {
  aankoopprijs?: number;
  aankoopkosten?: number;
  maandelijkseHuur?: number;
  onderhoudsPercentage?: number;
  leegstandMaanden?: number;
  jaarlijkseOV?: number;
  verzekeringJaarlijks?: number;
  syndicusVmeJaarlijks?: number;
  beheerkostenJaarlijks?: number;
  eigenInbreng?: number;
  jaarlijkseFinancieringslasten?: number;
  bouwjaar?: number;
}

export interface RendementBenchmarkRange {
  min: number;
  max: number;
}

export interface RendementBenchmarks {
  bruto: RendementBenchmarkRange;
  netto: RendementBenchmarkRange;
}

export interface Module3Result {
  status: "complete" | "partial";
  totaleInvestering?: number;
  jaarlijkseBrutoHuur?: number;
  onderhoudsPercentageGebruikt?: number;
  onderhoudsKosten?: number;
  leegstandMaandenGebruikt?: number;
  leegstandKosten?: number;
  jaarlijkseKostenTotaal?: number;
  jaarlijkseNettoHuur?: number;
  bar?: number;
  nar?: number;
  cashOnCash?: number;
  benchmarks: RendementBenchmarks;
  assumptions: string[];
  issues: CalculationIssue[];
  breakdown: CostLineItem[];
  sources: SourceReference[];
}

export type LeningType = "vast" | "variabel";

export interface LeningInput {
  geleendBedrag?: number;
  jaarlijkseRente?: number;
  looptijdJaren?: number;
  type?: LeningType;
  aankoopprijs?: number;
  aankoopSituatie?: AankoopSituatie;
  nettoMaandinkomen?: number;
  aantalKinderenTenLaste?: number;
  alleenstaand?: boolean;
}

export interface QuotiteitCheckResult {
  ltv?: number;
  richtlijnMax?: number;
  voldoetAanRichtlijn?: boolean;
  label?: string;
}

export interface DstiCheckResult {
  dsti?: number;
  grensPercentage?: number;
  haalbaar?: boolean;
  resterendBedrag?: number;
  minimaalResterendBedrag?: number;
}

export interface Module4Result {
  status: "complete" | "partial";
  maandlast?: number;
  totaleInterest?: number;
  totaleTerugbetaling?: number;
  eersteJaarInterest?: number;
  quotiteitCheck?: QuotiteitCheckResult;
  dstiCheck?: DstiCheckResult;
  assumptions: string[];
  issues: CalculationIssue[];
  sources: SourceReference[];
}

export interface HefboomInput {
  rtv?: number;
  rvv?: number;
  vreemdVermogen?: number;
  eigenVermogen?: number;
}

export interface Module5Result {
  status: "complete" | "partial";
  rtv?: number;
  rvv?: number;
  vreemdVermogen?: number;
  eigenVermogen?: number;
  verhoudingVreemdOpEigenVermogen?: number;
  rev?: number;
  hefboomIsPositief?: boolean;
  verschilMetRtv?: number;
  assumptions: string[];
  issues: CalculationIssue[];
  sources: SourceReference[];
}

export type Verwantschap =
  | "rechte_lijn_of_partner"
  | "broer_zus"
  | "oom_tante_neef_nicht"
  | "anderen";

export interface ErfSchijf {
  tot: number;
  tarief: number;
}

export interface ErfenisInput {
  onroerendAandeel?: number;
  roerendAandeel?: number;
  verwantschap?: Verwantschap;
  gewest?: Gewest;
  isLangstlevendePartner?: boolean;
  isGezinswoning?: boolean;
  groepsTotaal?: number;
}

export interface Module6Result {
  status: "complete" | "partial";
  gewest?: Gewest;
  verwantschap?: Verwantschap;
  belastbareOnroerendeAandeel?: number;
  belastbareRoerendeAandeel?: number;
  belastbareGrondslagTotaal?: number;
  groepsTotaal?: number;
  erfbelastingOpGroepsTotaal?: number;
  proRataFactor?: number;
  onroerendeErfbelasting?: number;
  roerendeErfbelasting?: number;
  totaleErfbelasting?: number;
  breakdown: CostLineItem[];
  assumptions: string[];
  issues: CalculationIssue[];
  sources: SourceReference[];
}
