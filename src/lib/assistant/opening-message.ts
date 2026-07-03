import { formatCurrency, formatPercent } from "@/lib/calc-engine";
import type {
  BaselineAnalysisResult,
  OpeningContext,
} from "@/lib/analysis/types";

const percentNumberFormatter = new Intl.NumberFormat("nl-BE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatPercentagePoints(value?: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return "n.v.t.";
  }

  return `${percentNumberFormatter.format(value)}%`;
}

export function maakOpeningsbericht(
  context: OpeningContext,
  result: BaselineAnalysisResult,
): string {
  const parts: string[] = [];
  const subject = [context.pandtype, context.gemeente]
    .filter(Boolean)
    .join(" in ");

  parts.push(
    subject
      ? `Eerste indruk van dit ${subject}:`
      : "Eerste indruk van dit dossier:",
  );

  if (result.module1.totalExtraCostsWithEstimate !== undefined) {
    parts.push(
      `boven op de aankoopprijs zit je al snel aan ongeveer ${formatCurrency(result.module1.totalExtraCostsWithEstimate)} extra aankoopkosten, waardoor je totale startbudget rond ${formatCurrency(result.module1.totalProjectBudgetWithEstimate)} uitkomt.`,
    );
  } else if (result.module1.totalExtraCostsKnown !== undefined) {
    parts.push(
      `ik kan vandaag al minstens ${formatCurrency(result.module1.totalExtraCostsKnown)} extra aankoopkosten hard becijferen, maar het echte totaal ligt nog wat hoger zolang de uitgaven aan derden niet ingevuld zijn.`,
    );
  } else {
    parts.push(
      "met de huidige input kan ik nog geen volledige aankoopkost sluiten, maar ik kan wel al tonen welke fiscale bouwstenen ontbreken.",
    );
  }

  if (result.module1.registrationTax.applicableRate !== undefined) {
    parts.push(
      `De registratiebelasting zit hier op ${formatPercent(result.module1.registrationTax.applicableRate)}${result.module1.registrationTax.totalDue !== undefined ? `, goed voor ${formatCurrency(result.module1.registrationTax.totalDue)}` : ""}.`,
    );
  }

  if (
    result.module1.registrationTax.applicableRate !== undefined &&
    result.module1.registrationTax.applicableRate >= 0.12
  ) {
    parts.push(
      "Dat maakt de instap zwaar: als investering moet de latere huur of meerwaarde dus echt overtuigend zijn om die frictiekost te verantwoorden.",
    );
  } else if (
    result.module1.registrationTax.applicableRate !== undefined &&
    result.module1.registrationTax.applicableRate <= 0.03
  ) {
    parts.push(
      "Fiscaal is dit een veel lichtere instap dan een klassieke investeringsaankoop, wat je speelruimte later merkbaar verbetert.",
    );
  }

  if (result.module2.totalDue !== undefined) {
    parts.push(
      `Voor de jaarlijkse onroerende voorheffing reken ik op basis van de huidige officiele Vlaamse parameters voorlopig met ongeveer ${formatCurrency(result.module2.totalDue)} per jaar.`,
    );
  }

  if (result.module3.status === "complete") {
    parts.push(
      `Met de huidige huur- en kosteninput kom ik uit op een BAR van ${formatPercentagePoints(result.module3.bar)} en een NAR van ${formatPercentagePoints(result.module3.nar)}.`,
    );

    if (
      result.module3.nar !== undefined &&
      result.module3.nar < result.module3.benchmarks.netto.min * 100
    ) {
      parts.push(
        "Dat netto rendement zit mager tegenover de gebruikelijke Belgische investeerdersvuistregels, dus hier wil je echt een sterke strategische reden voor hebben.",
      );
    } else if (
      result.module3.nar !== undefined &&
      result.module3.nar > result.module3.benchmarks.netto.max * 100
    ) {
      parts.push(
        "Dat netto rendement oogt op papier sterk voor de Belgische markt, al wil ik dan extra scherp kijken naar de houdbaarheid van huur, onderhoud en leegstand.",
      );
    }

    if (result.module3.cashOnCash !== undefined) {
      parts.push(
        `Op eigen cash gerekend geeft dat voorlopig een cash-on-cash return van ${formatPercentagePoints(result.module3.cashOnCash)}.`,
      );

      if (result.module3.cashOnCash < 0) {
        parts.push(
          "Dat is een negatieve kasstroom op je eigen geld, en daar moet je als investeerder bewust voor kiezen in plaats van erin te rollen.",
        );
      }
    }
  } else if (context.maandelijkseHuur === undefined) {
    parts.push(
      "Wat ik nog mis om hier een echte investeerdersmening op te plakken, is vooral de maandhuur: zonder die huur kan ik rendement, cashflow en hefboom nog niet eerlijk beoordelen.",
    );
  }

  if (result.module4.status === "complete") {
    parts.push(
      `Voor de lening kom ik op een geschatte maandlast van ${formatCurrency(result.module4.maandlast)} en ongeveer ${formatCurrency(result.module4.eersteJaarInterest)} interest in het eerste jaar.`,
    );

    if (result.module4.quotiteitCheck?.voldoetAanRichtlijn === false) {
      parts.push(
        "De gevraagde quotiteit zit boven de gebruikelijke prudentiele richtlijn voor dit type dossier, dus ik verwacht daar in de praktijk meer frictie of strengere voorwaarden.",
      );
    }

    if (result.module4.dstiCheck?.haalbaar === false) {
      parts.push(
        "Ook de haalbaarheidscheck oogt gespannen, wat mij voorzichtig maakt over comfort en bankacceptatie.",
      );
    }
  }

  const missingMessages = result.issues
    .filter((issue) => issue.level === "missing")
    .map((issue) => issue.message);

  if (missingMessages.length > 0) {
    parts.push(`Nog nodig voor meer zekerheid: ${missingMessages.join(" ")}`);
  }

  return parts.join(" ");
}
