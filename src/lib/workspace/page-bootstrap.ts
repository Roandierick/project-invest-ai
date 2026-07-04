import {
  loadWorkspaceBootstrap,
  type WorkspaceBootstrap,
} from "@/lib/conversations/repository";
import { createClient } from "@/lib/supabase/server";

export interface WorkspaceUser {
  id: string;
  email: string | null;
}

export interface WorkspacePageBootstrap {
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
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      currentUser: user ? { id: user.id, email: user.email ?? null } : null,
      initialBootstrap: user
        ? await loadWorkspaceBootstrap(supabase, preferredConversationId)
        : EMPTY_BOOTSTRAP,
    };
  } catch {
    return {
      currentUser: null,
      initialBootstrap: EMPTY_BOOTSTRAP,
    };
  }
}
