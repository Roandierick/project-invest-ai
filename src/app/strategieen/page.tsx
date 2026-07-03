import {
  ContentCard,
  ContentCta,
  ContentPageIntro,
  ContentSection,
  DetailBlock,
} from "@/components/content-page-sections";
import { WorkspaceContentShell } from "@/components/workspace-content-shell";
import { STRATEGIES } from "@/lib/content/content-pages";
import { loadWorkspacePageBootstrap } from "@/lib/workspace/page-bootstrap";

export default async function StrategieenPage() {
  const bootstrap = await loadWorkspacePageBootstrap();

  return (
    <WorkspaceContentShell {...bootstrap} activeNav="strategieen">
      <ContentPageIntro
        eyebrow="Vastgoedstrategieen"
        title="Zes strategieen die op de Belgische markt elk een andere discipline vragen"
        description="Een strategie klinkt vaak aantrekkelijk in marketingtaal, maar wordt pas interessant wanneer het rendementsprofiel, het operationele risico en de Belgische context tegelijk kloppen. Deze pagina legt uit waar de echte nuance zit."
      />

      <ContentSection
        title="Kies de strategie die past bij uw tijd, kapitaal en risicotolerantie"
        description="Huurgarantie, studentenkamers, commercieel of kustvastgoed: elk model heeft zijn eigen ritme en zijn eigen valkuil. Wie dat verschil onderschat, vergelijkt dossiers alsof ze inwisselbaar zijn terwijl ze dat zelden zijn."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          {STRATEGIES.map((strategy, index) => (
            <ContentCard
              key={strategy.name}
              kicker={`Strategie ${index + 1}`}
              title={strategy.name}
              tagline={strategy.tagline}
            >
              <DetailBlock
                label="Rendementsprofiel"
                text={strategy.rendementProfile}
              />
              <DetailBlock label="Risicoprofiel" text={strategy.riskProfile} />
              <DetailBlock
                label="Belgische aandachtspunten"
                text={strategy.attentionPoints}
              />
              <DetailBlock
                label="Relevant in de tool"
                text={strategy.moduleFocus}
              />
            </ContentCard>
          ))}
        </div>
      </ContentSection>

      <ContentCta
        currentUserId={bootstrap.currentUser?.id}
        title="Zet een strategie om in een echte dealtoets"
        description="De snelste manier om een strategie te ontmythologiseren, is een concreet pand door de tool halen. Start een analyse en bekijk meteen of de netto-opbrengst, de lening en de instapkost passen bij de aanpak die u voor ogen hebt."
      />
    </WorkspaceContentShell>
  );
}
