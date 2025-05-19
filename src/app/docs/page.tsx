import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage() {
  const documents = await DocumentModel.getAllDocumentsWithEvaluations();
  const session = await auth();
  const currentUserId = session?.user?.id;

  return (
    <DocumentsClient documents={documents} currentUserId={currentUserId} />
  );
}
