import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  Clock, 
  Pencil, 
  Upload 
} from "lucide-react";

import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";
import { Button } from "@/components/Button";
import { ExperimentalBadge } from "@/components/ExperimentalBadge";
import { AgentBadges } from "@/components/AgentBadges";
import { TabNavigation } from "./TabNavigation";

interface AgentLayoutProps {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}

export default async function AgentLayout({
  children,
  params,
}: AgentLayoutProps) {
  const resolvedParams = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const { agentService } = getServices();
  const result = await agentService.getAgentWithOwner(
    resolvedParams.agentId,
    session?.user?.id
  );

  if (result.isError()) {
    return notFound();
  }

  const agent = result.unwrap();
  if (!agent) {
    return notFound();
  }

  const isOwner = agent.isOwner;
  const agentId = resolvedParams.agentId;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
              {agent.name}
            </h2>
            {agent.ephemeralBatch && (
              <ExperimentalBadge 
                trackingId={agent.ephemeralBatch.trackingId}
                className="ml-2"
              />
            )}
          </div>
          <p className="text-sm text-gray-500">
            v{agent.version}
            {agent.owner && (
              <>
                {" • "}
                <Link
                  href={`/users/${agent.owner.id}`}
                  className="text-blue-500 hover:text-blue-700"
                >
                  {agent.owner.name || "View Owner"}
                </Link>
              </>
            )}
          </p>
          <div className="mt-2 flex gap-2">
            <AgentBadges
              isDeprecated={agent.isDeprecated}
              isRecommended={agent.isRecommended}
              isSystemManaged={agent.isSystemManaged}
              providesGrades={agent.providesGrades}
              size="md"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/agents/${agentId}/versions`}>
            <Button variant="secondary" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Version History
            </Button>
          </Link>
          {isOwner && (
            <>
              <Link href={`/agents/${agentId}/import-yaml`}>
                <Button variant="secondary" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </Link>
              <Link href={`/agents/${agentId}/edit`}>
                <Button variant="secondary" className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Agent
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation agentId={agentId} isOwner={isOwner || false} isAdmin={isAdmin} />

      {/* Content */}
      <div className="mt-8">
        {children}
      </div>
    </div>
  );
}