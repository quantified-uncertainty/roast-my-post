import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        evaluation: {
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
          },
        },
        tasks: {
          select: {
            id: true,
            name: true,
            modelName: true,
            priceInCents: true,
            timeInSeconds: true,
            log: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}