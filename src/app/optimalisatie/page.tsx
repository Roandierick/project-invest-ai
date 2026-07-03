import {
  ContentCard,
  ContentCta,
  ContentPageIntro,
  ContentSection,
  DetailBlock,
} from "@/components/content-page-sections";
import { WorkspaceContentShell } from "@/components/workspace-content-shell";
import { OPTIMIZATION_THEMES } from "@/lib/content/content-pages";

export default async function OptimalisatiePage() {
  return (
    <WorkspaceContentShell activeNav="optimalisatie">
      <ContentPageIntro
        eyebrow="Optimalisatiethema's"
        title="Optimalisatie begint niet bij trucs, maar bij een heldere Belgische vastgoedlogica"
        description="Of het nu gaat over financiering, successieplanning, fiscaliteit of investeren via een vennootschap: optimalisatie werkt alleen wanneer de basisdeal al gezond is. Deze thema's helpen om die tweede laag verstandig op te bouwen."
      />

      <ContentSection
        title="Gebruik structuur om uw rendement sterker te maken, niet om zwakke dossiers te verbergen"
        description="Een goede structuur kan een degelijk pand nog beter maken. Een slechte deal wordt daar zelden plots goed van. Daarom leggen deze thema's telkens de link tussen strategie, praktische beslissingen en de rekenmodules die het verschil zichtbaar maken."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          {OPTIMIZATION_THEMES.map((theme, index) => (
            <ContentCard
              key={theme.name}
              kicker={`Thema ${index + 1}`}
              title={theme.name}
              tagline={theme.tagline}
            >
              <p>{theme.explanation}</p>
              <DetailBlock
                label="Praktische tips"
                text={theme.practicalTips}
              />
              <DetailBlock
                label="Relevant in de tool"
                text={theme.moduleFocus}
              />
            </ContentCard>
          ))}
        </div>
      </ContentSection>

      <ContentCta
        title="Laat een echt dossier zien waar optimalisatie zin heeft"
        description="Als u wilt weten of hefboom, financiering of successieplanning in uw situatie werkelijk waarde toevoegt, start dan een nieuwe analyse. De tool toont sneller dan theorie waar de winst zit en waar vooral extra risico schuilt."
      />
    </WorkspaceContentShell>
  );
}
