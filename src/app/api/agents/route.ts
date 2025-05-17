import { NextResponse } from "next/server";

import { PrismaClient } from "@prisma/client";

export async function GET() {
  const prisma = new PrismaClient();
  const dbAgents = await prisma.agent.findMany({
    include: {
      versions: {
        orderBy: {
          version: "desc",
        },
        take: 1,
      },
    },
  });

  const agents = dbAgents.map((dbAgent) => ({
    id: dbAgent.id,
    name: dbAgent.versions[0].name,
    purpose: dbAgent.versions[0].agentType.toLowerCase(),
    version: dbAgent.versions[0].version.toString(),
    description: dbAgent.versions[0].description,
  }));

  return NextResponse.json({ agents });
}
