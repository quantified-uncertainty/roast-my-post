import Link from "next/link";
import { notFound } from "next/navigation";

import AgentsList from "@/components/AgentsList";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { USER_DISPLAY } from "@/shared/constants/constants";
import type { Agent } from "@roast/ai";

export const dynamic = "force-dynamic";

export default async function UserAgentsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await auth();
  const _currentUserId = session?.user?.id;

  // Get the user to display their name
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Get agents submitted by this user
  const dbAgents = await prisma.agent.findMany({
    where: {
      submittedById: userId,
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform to frontend Agent shape
  const agents: Agent[] = dbAgents
    .filter((agent) => agent.versions.length > 0)
    .map((agent) => {
      const latestVersion = agent.versions[0];
      return {
        id: agent.id,
        name: latestVersion.name,
        version: latestVersion.version.toString(),
        description: latestVersion.description,
        primaryInstructions: latestVersion.primaryInstructions || undefined,
        selfCritiqueInstructions:
          latestVersion.selfCritiqueInstructions || undefined,
        providesGrades: latestVersion.providesGrades ?? false,
        isSystemManaged: agent.isSystemManaged ?? false,
      };
    });

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.name || USER_DISPLAY.GUEST_NAME}'s Custom Evaluators
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {agents.length} evaluator{agents.length !== 1 ? "s" : ""}{" "}
                  created
                </p>
              </div>
              {_currentUserId === userId && (
                <Link
                  href="/evaluators/new"
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Make a new custom evaluator
                </Link>
              )}
            </div>
          </div>

          <AgentsList agents={agents} />
        </div>
      </div>
    </div>
  );
}
