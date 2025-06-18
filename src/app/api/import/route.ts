import {
  NextRequest,
  NextResponse,
} from "next/server";

import { auth } from "@/lib/auth";
import { processArticle } from "@/lib/articleImport";
import { DocumentModel } from "@/models/Document";


export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    console.log("🔐 Session debug:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    if (!session?.user?.id) {
      console.log("❌ No valid session found");
      return NextResponse.json(
        { error: "User must be logged in to import a document" },
        { status: 401 }
      );
    }

    const { url, importUrl } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Use the shared article processing library
    const processedArticle = await processArticle(url);

    const documentData = {
      title: processedArticle.title,
      authors: processedArticle.author,
      content: processedArticle.content,
      urls: processedArticle.url,
      platforms: processedArticle.platforms.join(", "),
      importUrl: importUrl || url,
    };

    console.log("💾 Creating document...");
    const document = await DocumentModel.create({
      ...documentData,
      submittedById: session.user.id,
    });

    const latestVersion = document.versions[document.versions.length - 1];
    return NextResponse.json({
      success: true,
      documentId: document.id,
      document: {
        id: document.id,
        title: latestVersion.title,
        authors: latestVersion.authors,
      },
    });
  } catch (error) {
    console.error("❌ Error importing document:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import document",
      },
      { status: 500 }
    );
  }
}
