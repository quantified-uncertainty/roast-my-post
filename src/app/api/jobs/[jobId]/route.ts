import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  if (!jobId) {
    return new Response(JSON.stringify({ error: "Missing jobId" }), {
      status: 400,
    });
  }
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { tasks: true },
    });
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
      });
    }
    return new Response(JSON.stringify(job), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}
