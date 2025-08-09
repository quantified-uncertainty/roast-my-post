import { DocumentModel } from "@/models/Document";

import DocumentsClient from "./DocumentsClient";

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  // Load 50 documents efficiently (only fetches what's needed)
  const recentDocuments = await DocumentModel.getRecentDocumentsWithEvaluations(50);

  return (
    <DocumentsClient 
      documents={recentDocuments} 
      initialLoad={true}
    />
  );
}
