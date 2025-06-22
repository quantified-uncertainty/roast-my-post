import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const evaluations = await prisma.evaluation.findMany({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        document: {
          select: {
            id: true,
            versions: {
              select: {
                title: true,
              },
              orderBy: {
                version: "desc",
              },
              take: 1,
            },
          },
        },
        agent: {
          select: {
            id: true,
            versions: {
              select: {
                name: true,
              },
              orderBy: {
                version: "desc",
              },
              take: 1,
            },
          },
        },
        versions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            summary: true,
            analysis: true,
            grade: true,
            createdAt: true,
            agentVersion: {
              select: {
                name: true,
                version: true,
              },
            },
            comments: {
              select: {
                id: true,
                title: true,
                description: true,
                importance: true,
                grade: true,
              },
            },
          },
        },
        jobs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            error: true,
            costInCents: true,
            durationInSeconds: true,
          },
        },
      },
    });

    return NextResponse.json({ evaluations });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}