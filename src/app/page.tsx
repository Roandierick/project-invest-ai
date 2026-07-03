import { PersistentAnalysisWorkspace } from "@/components/persistent-analysis-workspace";
import type { WorkspaceBootstrap } from "@/lib/conversations/repository";
import { shouldShowSupabaseSetupNotice } from "@/lib/supabase/env";

const EMPTY_BOOTSTRAP: WorkspaceBootstrap = {
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
};

interface HomeProps {
  searchParams?: Promise<{
    conversation?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const shouldShowSetupNotice = shouldShowSupabaseSetupNotice();

  return (
    <PersistentAnalysisWorkspace
      isSupabaseConfigured={!shouldShowSetupNotice}
      currentUser={null}
      initialBootstrap={EMPTY_BOOTSTRAP}
      preferredConversationId={resolvedSearchParams.conversation ?? null}
    />
  );
}
