import { PersistentAnalysisWorkspace } from "@/components/persistent-analysis-workspace";
import type { WorkspaceBootstrap } from "@/lib/conversations/repository";
import { createServerClient } from "@/lib/supabase/server";

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
  let currentUser: { id: string; email: string | null } | null = null;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      currentUser = { id: user.id, email: user.email ?? null };
    }
  } catch {
    // Niet-ingelogd of server-side auth niet beschikbaar blijft gewoon null.
  }

  return (
    <PersistentAnalysisWorkspace
      currentUser={currentUser}
      initialBootstrap={EMPTY_BOOTSTRAP}
      preferredConversationId={resolvedSearchParams.conversation ?? null}
    />
  );
}
