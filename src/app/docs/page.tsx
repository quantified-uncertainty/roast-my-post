import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage() {
  // Load only recent 20 documents by default
  const allDocuments = await DocumentModel.getAllDocumentsWithEvaluations();
  const recentDocuments = allDocuments.slice(0, 20);
  
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
