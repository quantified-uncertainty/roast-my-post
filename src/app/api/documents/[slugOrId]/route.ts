import { NextRequest, NextResponse } from "next/server";

import { DocumentModel } from "@/models/Document";

export async function GET(
  req: NextRequest,
  { params }: { params: { slugOrId: string } }
) {
  const { slugOrId: id } = params;

  try {
    // Use the DocumentModel to get a formatted document
    const document = await DocumentModel.getDocumentWithEvaluations(id);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
