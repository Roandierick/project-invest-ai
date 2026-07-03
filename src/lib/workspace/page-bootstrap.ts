import { loadWorkspaceBootstrap, type WorkspaceBootstrap } from "@/lib/conversations/repository";
import { shouldShowSupabaseSetupNotice } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface WorkspaceUser {
  id: string;
  email: string | null;
}

export interface WorkspacePageBootstrap {
  isSupabaseConfigured: boolean;
  currentUser: WorkspaceUser | null;
  initialBootstrap: WorkspaceBootstrap;
}

const EMPTY_BOOTSTRAP: WorkspaceBootstrap = {
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
};

export async function loadWorkspacePageBootstrap(
  preferredConversationId?: string | null,
): Promise<WorkspacePageBootstrap> {
  if (shouldShowSupabaseSetupNotice()) {
    return {
      isSupabaseConfigured: false,
      currentUser: null,
      initialBootstrap: EMPTY_BOOTSTRAP,
    };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    isSupabaseConfigured: true,
    currentUser: user ? { id: user.id, email: user.email ?? null } : null,
    initialBootstrap: user
      ? await loadWorkspaceBootstrap(supabase, preferredConversationId)
      : EMPTY_BOOTSTRAP,
  };
}
