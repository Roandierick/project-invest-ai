import { ContentTopbar } from "@/components/content-topbar";
import { WorkspaceFrame } from "@/components/workspace-frame";
import type { WorkspaceNavKey } from "@/components/workspace-sidebar";

interface WorkspaceContentShellProps {
  activeNav: WorkspaceNavKey;
  children: React.ReactNode;
  currentUser?: {
    id: string;
    email: string | null;
  } | null;
  conversations?: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
  activeConversationId?: string | null;
}

export function WorkspaceContentShell({
  currentUser,
  conversations = [],
  activeConversationId,
  activeNav,
  children,
}: WorkspaceContentShellProps) {
  return (
    <WorkspaceFrame
      currentUserEmail={currentUser?.email ?? null}
      currentUserId={currentUser?.id}
      conversations={conversations}
      activeConversationId={activeConversationId ?? undefined}
      activeNav={activeNav}
      topbar={<ContentTopbar activeNav={activeNav} />}
    >
      <div className="space-y-6">{children}</div>
    </WorkspaceFrame>
  );
}
