import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage() {
  // Load recent 50 documents efficiently (only fetches what's needed)
  const recentDocuments = await DocumentModel.getRecentDocumentsWithEvaluations(50);
  
  const session = await auth();
  const currentUserId = session?.user?.id;

  return (
    <DocumentsClient 
      documents={recentDocuments} 
      currentUserId={currentUserId}
      initialLoad={true}
    />
  );
}
