import { connection } from "next/server";

import { PersistentAnalysisWorkspace } from "@/components/persistent-analysis-workspace";
import { loadWorkspacePageBootstrap } from "@/lib/workspace/page-bootstrap";

interface HomeProps {
  searchParams?: Promise<{
    conversation?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  await connection();
  const bootstrap = await loadWorkspacePageBootstrap(
    resolvedSearchParams.conversation ?? null,
  );

  return (
    <PersistentAnalysisWorkspace
      isSupabaseConfigured={bootstrap.isSupabaseConfigured}
      currentUser={bootstrap.currentUser}
      initialBootstrap={bootstrap.initialBootstrap}
    />
  );
}
