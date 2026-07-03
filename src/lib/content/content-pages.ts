export interface InvestorTypeContent {
  name: string;
  tagline: string;
  summary: string;
  choices: string;
  pitfalls: string;
  moduleFocus: string;
}

export interface StrategyContent {
  name: string;
  tagline: string;
  rendementProfile: string;
  riskProfile: string;
  attentionPoints: string;
  moduleFocus: string;
}

export interface OptimizationThemeContent {
  name: string;
  tagline: string;
  explanation: string;
  practicalTips: string;
  moduleFocus: string;
}

export const INVESTOR_TYPES: InvestorTypeContent[] = [
  {
    name: "De Sociale Vastgoedbelegger",
    tagline:
      "Investeert met impact en combineert financieel rendement met maatschappelijke meerwaarde.",
    summary:
      "Deze belegger kijkt verder dan de spreadsheet alleen. Woonkwaliteit, betaalbaarheid, buurtversterking en langdurige verhuurbaarheid spelen minstens even hard mee als de pure aankoopdeal.",
    choices:
      "Typische keuzes zijn degelijke residentiele panden in buurten met stabiele woonvraag, samenwerkingen met sociale of semipublieke spelers en investeringen waar bezetting en leefbaarheid zwaarder wegen dan snelle exitwinst.",
    pitfalls:
      "De valkuil zit vaak in te veel goodwill en te weinig onderhandeling. Als instapkosten, OV en onderhoud structureel te zwaar doorwegen, wordt maatschappelijke impact een excuus voor een zwakke deal.",
    moduleFocus:
      "Voor dit profiel zijn aankoopkosten, netto rendement en langetermijnkosten sleutelgegevens; vooral module 1, module 2 en module 3 geven hier de echte onderbouw.",
  },
  {
    name: "De Verstandige Vastgoedbelegger",
    tagline:
      "Denkt strategisch en kiest voor stabiel rendement op lange termijn.",
    summary:
      "De verstandige belegger zoekt geen spektakel, maar dossiers die over tien of vijftien jaar nog steeds logisch ogen. Stabiliteit, verhuurbaarheid en beheersbare kosten krijgen voorrang op bravoure.",
    choices:
      "Je ziet dit profiel vaak kiezen voor appartementen of klassieke gezinswoningen in gemeenten met brede huurvraag, duidelijke marktprijzen en beperkte verrassingen in syndicus-, renovatie- of leegstandskost.",
    pitfalls:
      "De grootste fout is schijnveiligheid: een pand kan er degelijk uitzien maar toch een te zwakke NAR hebben door hoge instapkost of onderschat onderhoud.",
    moduleFocus:
      "Voor dit profiel is het netto aanvangsrendement de ruggengraat van de beslissing, aangevuld met een nuchtere leningstoets via module 3 en module 4.",
  },
  {
    name: "De Risiconemende Vastgoedbelegger",
    tagline:
      "Durft kansen te grijpen en mikt op hoger rendement met oog voor marktpotentieel.",
    summary:
      "Deze investeerder ziet opportuniteit in panden of locaties waar anderen afhaken: renovatiedossiers, opkomende buurten, gemengd gebruik of situaties met complexere positionering.",
    choices:
      "Typische keuzes zijn panden met herwaarderingspotentieel, hogere huuropportuniteit na werken of financieringsstructuren waarbij hefboom en timing een groter gewicht krijgen dan bij klassieke buy-and-hold.",
    pitfalls:
      "Het risico is niet dat deze belegger lef toont, maar dat hij zijn eigen scenario te graag gelooft. Zodra rente, leegstand of renovatie-uitval tegenzitten, kan de mooie case snel kantelen.",
    moduleFocus:
      "Voor dit profiel is het hefboomeffect een sleutelgegeven. Module 3, module 4 en vooral module 5 maken zichtbaar of het extra risico ook echt extra rendement oplevert.",
  },
  {
    name: "De Zorgeloze Vastgoedbelegger",
    tagline:
      "Verkiest zekerheid en comfort met investeringen die volledig ontzorgd worden.",
    summary:
      "Deze belegger koopt liever rust dan complexiteit. Hij wil voorspelbaarheid, professioneel beheer en een dossier dat niet elke maand aandacht vraagt.",
    choices:
      "Vaak gaat het om formules met huurgarantie, nieuwbouwproducten, zorgvastgoed of residentiele panden in segmenten waar beheer, bezetting en onderhoud sterk geprotocolleerd zijn.",
    pitfalls:
      "Ontzorging mag geen vrijgeleide worden voor een te hoge instapprijs. Een dossier kan operationeel comfortabel zijn en tegelijk financieel matig, precies omdat de rust vooraf al ingeprijsd is.",
    moduleFocus:
      "Voor dit profiel zijn module 1 en module 3 cruciaal: als aankoopkost en netto-opbrengst niet kloppen, is de ontzorging weinig waard.",
  },
  {
    name: "De Familiale Vastgoedbelegger",
    tagline:
      "Investeert met een visie op de toekomst en bouwt vandaag aan waarde voor de volgende generatie.",
    summary:
      "Hier speelt vermogenstransfer mee vanaf de eerste aankoop. De deal moet niet alleen renderen, maar ook later overdraagbaar, begrijpelijk en fiscaal verdedigbaar blijven voor de familie.",
    choices:
      "Typische keuzes zijn panden met duurzame verhuurwaarde, eenvoudige eigendomsstructuren en investeringen die later zonder al te veel frictie in een successieplanning kunnen landen.",
    pitfalls:
      "De fout is vaak dat familie-intentie te vroeg de plaats van prijsdiscipline inneemt. Een overbetaald pand blijft ook in de volgende generatie een overbetaald pand.",
    moduleFocus:
      "Voor dit profiel zijn successieplanning en totale instapkost belangrijke ankers; module 1 en module 6 geven hier het strategische kader.",
  },
  {
    name: "De Professionele Vastgoedbelegger",
    tagline:
      "Benadert vastgoed als een onderneming, met oog voor schaal, rendement en strategie.",
    summary:
      "De professionele belegger denkt in portefeuilles, allocatie en kapitaalrotatie. Elk pand moet zichzelf bewijzen binnen een bredere strategie en niet alleen als los dossier.",
    choices:
      "Je ziet hier sneller combinaties van residentieel, commercieel en opportunistische aankopen, met duidelijke discipline rond eigen inbreng, financieringskost, exitpotentieel en operationele efficientie.",
    pitfalls:
      "De grootste valkuil is schaal zonder selectiviteit. Meer volume compenseert geen zwakke unit economics; slechte deals worden op grotere schaal alleen grotere slechte deals.",
    moduleFocus:
      "Voor dit profiel moeten module 3, module 4 en module 5 samen gelezen worden: rendement, financieringsstructuur en hefboom horen hier in eenzelfde beslissingskader.",
  },
];

export const STRATEGIES: StrategyContent[] = [
  {
    name: "Investeren met huurgarantie",
    tagline:
      "Zorgeloze inkomsten dankzij gegarandeerde huur, zonder omkijken naar beheer of leegstand.",
    rendementProfile:
      "Het rendementsprofiel is meestal eerder voorspelbaar dan spectaculair. De meerwaarde zit in inkomensstabiliteit en tijdswinst, niet per se in een uitzonderlijk hoge netto-opbrengst.",
    riskProfile:
      "Het operationele risico ligt lager, maar het contractuele en productrisico wordt belangrijker. Je koopt mee de kwaliteit van de exploitant en de sterkte van de garantie.",
    attentionPoints:
      "In Belgie moet je scherp kijken naar de contractduur, de tegenpartij en de werkelijke marktwaarde van het pand los van de verkoopsformule. Een gegarandeerde huur is alleen waardevol als de onderliggende prijs ook klopt.",
    moduleFocus:
      "Voor deze strategie zijn vooral module 1 en module 3 doorslaggevend: de aankoopfrictie en het netto rendement bepalen of de rust ook financieel steek houdt.",
  },
  {
    name: "Investeren in klassiek vastgoed",
    tagline:
      "Tijdloze strategie: bouw vermogen op via residentieel vastgoed met stabiele huurinkomsten en waardestijging op lange termijn.",
    rendementProfile:
      "Het profiel is evenwichtig: doorgaans gematigd maar degelijk rendement, met de kracht van herhaling en brede verhuurbaarheid in de Belgische markt.",
    riskProfile:
      "Het risico is verspreid maar niet afwezig. Onderhoud, huurrotatie en lokale prijszetting maken het verschil tussen een veilige indruk en een echt gezonde deal.",
    attentionPoints:
      "In Belgie loont vooral de nuance per gemeente en pandtype. Een klassiek appartement in een sterke huurmarkt gedraagt zich totaal anders dan een verouderde woning in een zwakke micro-locatie.",
    moduleFocus:
      "Module 2 en module 3 zijn hier het dagelijkse kompas, aangevuld met module 4 zodra financiering een belangrijk deel van de case wordt.",
  },
  {
    name: "Investeren in studentenkamers",
    tagline:
      "De kracht van een stabiele huurmarkt in Belgische studentensteden met hoge bezettingsgraad en rendement.",
    rendementProfile:
      "Studentenvastgoed kan een pittiger bruto-opbrengst tonen dan klassiek residentieel, maar de echte kwaliteit zit in de combinatie van bezettingsgraad, beheerlast en regulatoire context.",
    riskProfile:
      "Het risico verschuift richting exploitatie: wisselende huurders, hogere rotatie, meer beheer en afhankelijkheid van de lokale studentenmarkt.",
    attentionPoints:
      "Belgie vraagt hier vooral aandacht voor vergunningen, stedenbouw, brandveiligheid en de feitelijke verhuurbaarheid buiten de piekcommunicatie van projectverkopers.",
    moduleFocus:
      "Voor deze strategie moeten module 3 en module 5 samen gelezen worden: bij hogere bruto-opbrengst wil je meteen weten of de netto-case en de hefboom ook overeind blijven.",
  },
  {
    name: "Investeren in seniorenvastgoed",
    tagline:
      "Combineer maatschappelijke impact met zekerheid: investeer in kwalitatieve zorgwoningen met gegarandeerde huurinkomsten.",
    rendementProfile:
      "Seniorenvastgoed leunt vaak op contractuele stabiliteit en langere gebruiksduur. Het rendement zit meer in voorspelbaarheid en minder in agressieve waardesprongen.",
    riskProfile:
      "Het risico is sterk gekoppeld aan exploitant en zorgmodel. De belegger koopt niet alleen vastgoed, maar ook een operationeel verhaal.",
    attentionPoints:
      "In Belgie is de geloofwaardigheid van de uitbater cruciaal. Daarnaast moet je opletten dat de zorgcomponent de onderliggende vastgoedwaarde niet maskeert.",
    moduleFocus:
      "Module 1, module 3 en soms module 6 zijn hier relevant: instapkosten, netto-opbrengst en de latere overdraagbaarheid van het vermogen moeten samen kloppen.",
  },
  {
    name: "Investeren in commercieel vastgoed",
    tagline:
      "Kies voor rendement via winkelpanden, kantoren of mixed-use projecten met sterke huurovereenkomsten en waardevastheid.",
    rendementProfile:
      "Commercieel vastgoed kan aantrekkelijk ogen door stevigere huuropbrengst of langere contracten, maar het dossier moet veel harder worden gefilterd op kwaliteit van huurder en locatie.",
    riskProfile:
      "Het leegstandsrisico is meestal scherper dan bij residentieel, en herverhuring kan duurder en trager verlopen. Een goed contract today is geen garantie voor een sterke exit tomorrow.",
    attentionPoints:
      "Belgische context betekent hier: kijk voorbij de headline-rendementen naar handelspassages, gebruikersdynamiek, mobiliteit, EPC-impact en de praktische vervangbaarheid van de huurder.",
    moduleFocus:
      "Voor commercieel vastgoed moet vooral module 3 streng gelezen worden, met module 4 en module 5 als check op financieringsdruk en negatieve hefboomrisico's.",
  },
  {
    name: "Investeren in kustvastgoed",
    tagline:
      "Beleef het beste van twee werelden: een vastgoedbelegging aan zee die rendement en eigen genot combineert.",
    rendementProfile:
      "Kustvastgoed kan sterk emotioneel gedragen zijn. Financieel varieert het profiel sterk naargelang verhuurformule, seizoensgebruik en de mate waarin eigen gebruik opbrengst verdringt.",
    riskProfile:
      "Het risico zit hier vaak in seizoensafhankelijkheid, hogere onderhoudsdruk en de verleiding om het dossier te beoordelen zoals een levensstijlproduct in plaats van een investering.",
    attentionPoints:
      "In Belgie moet je extra aandacht hebben voor VME-kosten, renovatie van gebouwschillen, verouderde residenties en het verschil tussen toeristische aantrekkingskracht en echte netto-opbrengst.",
    moduleFocus:
      "Voor kustvastgoed zijn module 1, module 3 en module 4 bijzonder relevant: zodra eigen gebruik meespeelt, wil je de financieringslast nog nuchterder naast de netto-opbrengst zetten.",
  },
];

export const OPTIMIZATION_THEMES: OptimizationThemeContent[] = [
  {
    name: "Investeren via vennootschap",
    tagline:
      "Ontdek hoe u via uw vennootschap fiscaal voordelig en strategisch kunt investeren in vastgoed.",
    explanation:
      "Investeren via een vennootschap kan zinvol zijn wanneer vastgoed deel uitmaakt van een bredere vermogens- of ondernemingslogica. Het gaat dan niet alleen over fiscaliteit, maar ook over aansprakelijkheid, cashflowsturing, opvolging en de manier waarop het pand past binnen de rest van de activiteit.",
    practicalTips:
      "Begin niet bij de vennootschapsvorm, maar bij de vraag waarom het pand daar thuishoort. Kijk vervolgens naar aankoopfrictie, financierbaarheid en het verschil tussen een goede deal prive en een goede deal in een vennootschap.",
    moduleFocus:
      "Module 1 en module 4 zijn hier vaak de eerste toetsstenen: instapkost en financieringsstructuur geven snel aan of het dossier in een vennootschap logisch blijft.",
  },
  {
    name: "Het hefboomeffect",
    tagline:
      "Gebruik de kracht van geleend kapitaal om uw rendement te vergroten en uw vermogen sneller te laten groeien.",
    explanation:
      "Hefboom werkt alleen in uw voordeel als het rendement op het totaal vermogen hoger ligt dan de kost van het vreemd vermogen. Zodra de rente duurder wordt dan wat het pand netto oplevert, draait diezelfde hefboom tegen u in.",
    practicalTips:
      "Kijk niet naar hefboom als een abstract financebegrip, maar als een druktest op uw dossier. Een hogere lening is geen overwinning als ze een zwakke NAR verbergt of uw maandcomfort onderuit haalt.",
    moduleFocus:
      "Hier is de koppeling rechtlijnig: module 3 levert het netto aanvangsrendement, module 4 de rentecontext en module 5 toont of de hefboom echt positief is.",
  },
  {
    name: "Fiscale optimalisatie in Belgie",
    tagline:
      "Maximaliseer uw rendement door slim gebruik te maken van de fiscale voordelen die vastgoed biedt in Belgie.",
    explanation:
      "Fiscale optimalisatie begint in vastgoed meestal niet bij exotische structuren, maar bij het correct lezen van de basisregels: registratierechten, eigendomsstructuur, timing, woonstatuut en de impact van jaarlijkse lasten.",
    practicalTips:
      "Werk eerst de grote posten uit voor u naar verfijning zoekt. Een onhandige aankoopstructuur of verkeerd ingeschatte instapkost doet meer schade dan tien kleine optimalisatie-ingrepen later kunnen herstellen.",
    moduleFocus:
      "Voor dit thema zijn module 1 en module 2 de natuurlijke start: ze maken zichtbaar waar de fiscale frictie vandaag al in uw dossier zit.",
  },
  {
    name: "Successieplanning",
    tagline:
      "Bouw vandaag al aan een zorgeloze overdracht van uw vermogen en bescherm de toekomst van uw familie.",
    explanation:
      "Wie vastgoed opbouwt zonder na te denken over overdracht, laat vaak later onnodige frictie achter. Successieplanning gaat over structuur, voorbereiding en het vermijden dat een familiaal doel botst met een ondoordachte fiscale werkelijkheid.",
    practicalTips:
      "Denk vroeg na over gewest, verwantschap, gezinswoning en de plaats van roerend versus onroerend vermogen. Een overdracht hoeft niet vandaag te gebeuren om vandaag al slim te worden voorbereid.",
    moduleFocus:
      "Module 6 is hier het directe ankerpunt. In combinatie met module 1 ziet u tegelijk wat de instap vandaag kost en wat de overdracht morgen kan betekenen.",
  },
  {
    name: "Pensioenopbouw",
    tagline:
      "Creeer financiele rust voor later met vastgoed als stabiele pijler in uw persoonlijk pensioenplan.",
    explanation:
      "Vastgoed kan een sterke pensioenpijler zijn wanneer het netto cashflow, beheersbaarheid en overdraagbaarheid combineert. Het gaat dus niet alleen over bezit, maar over hoe bruikbaar dat bezit later effectief wordt.",
    practicalTips:
      "Kies liever een begrijpelijk dossier met houdbare netto-opbrengst dan een spectaculaire case die later veel beheer, renovatie of herstructurering vraagt. Pensioenrust begint bij eenvoud die standhoudt.",
    moduleFocus:
      "Voor pensioenopbouw zijn module 3 en module 6 vaak de rode draad: netto-opbrengst vandaag en overdraagbaarheid later moeten met elkaar sporen.",
  },
  {
    name: "Financiering",
    tagline:
      "Ontdek hoe een doordachte financieringsstrategie uw rendement verhoogt en uw investeringskracht vergroot.",
    explanation:
      "Financiering is geen randdetail maar een volwaardig strategisch instrument. De juiste looptijd, rente, eigen inbreng en quotiteit bepalen mee hoe soepel een dossier ademt en hoeveel marges u bewaart voor een volgende stap.",
    practicalTips:
      "Beoordeel een lening niet alleen op de maandlast, maar ook op haar effect op netto rendement, resterende buffer en hefboomkwaliteit. Goedkoop ogende schuld kan nog steeds een dure keuze zijn als de structuur wringt.",
    moduleFocus:
      "Module 4 en module 5 horen hier samen: eerst begrijpen wat de lening doet, daarna nagaan of ze het eigen rendement versterkt of juist afremt.",
  },
];
