import { DocumentModel } from "@/models/Document";

import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage() {
  const documents = await DocumentModel.getAllDocumentsWithEvaluations();
  return <DocumentsClient documents={documents} />;
}
