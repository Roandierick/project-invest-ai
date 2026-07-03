import {
  ContentCard,
  ContentCta,
  ContentPageIntro,
  ContentSection,
  DetailBlock,
} from "@/components/content-page-sections";
import { WorkspaceContentShell } from "@/components/workspace-content-shell";
import { INVESTOR_TYPES } from "@/lib/content/content-pages";
import { loadWorkspacePageBootstrap } from "@/lib/workspace/page-bootstrap";

export default async function InvesteerdersPage() {
  const bootstrap = await loadWorkspacePageBootstrap();

  return (
    <WorkspaceContentShell {...bootstrap} activeNav="investeerders">
      <ContentPageIntro
        eyebrow="Investeerderstypes"
        title="Zes manieren waarop Belgische vastgoedinvesteerders naar dezelfde markt kijken"
        description="Niet elke belegger zoekt hetzelfde in vastgoed. Sommigen willen vooral rust, anderen schaal, overdraagbaarheid of hefboom. Deze zes profielen helpen om scherper te zien welk soort dossier echt bij uw logica past, en waar uw blinde vlekken meestal zitten."
      />

      <ContentSection
        title="Herken het profiel achter de aankoopbeslissing"
        description="Dezelfde woning kan voor de ene belegger een degelijke lange termijncase zijn en voor de andere een matige deal. Het verschil zit zelden alleen in het pand, maar vooral in de bedoeling, tijdshorizon en tolerantie voor frictie."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          {INVESTOR_TYPES.map((profile, index) => (
            <ContentCard
              key={profile.name}
              kicker={`Type ${index + 1}`}
              title={profile.name}
              tagline={profile.tagline}
            >
              <p>{profile.summary}</p>
              <DetailBlock
                label="Typische keuzes"
                text={profile.choices}
              />
              <DetailBlock label="Valkuilen" text={profile.pitfalls} />
              <DetailBlock
                label="Relevant in de tool"
                text={profile.moduleFocus}
              />
            </ContentCard>
          ))}
        </div>
      </ContentSection>

      <ContentCta
        currentUserId={bootstrap.currentUser?.id}
        title="Toets uw eigen profiel meteen aan een concreet pand"
        description="Een profiel is pas nuttig als u het vertaalt naar een echte aankoopbeslissing. Start een nieuwe analyse en kijk of uw dossier vooral vraagt om rendementsdiscipline, financieringsruimte, hefboomcontrole of juist een successiebril."
      />
    </WorkspaceContentShell>
  );
}
