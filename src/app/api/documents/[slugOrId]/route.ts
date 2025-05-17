import { NextRequest, NextResponse } from "next/server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { slugOrId: string } }
) {
  const { slugOrId: id } = params;

  // Only try to find by ID
  const document = await prisma.document.findUnique({
    where: { id },
    include: { versions: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json(document);
}
