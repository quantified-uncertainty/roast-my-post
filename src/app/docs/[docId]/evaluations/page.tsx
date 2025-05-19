import { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

import EvaluationsClient from "./EvaluationsClient";

interface EvaluationsPageProps {
  params: {
    docId: string;
  };
}

export async function generateMetadata({
  params,
}: EvaluationsPageProps): Promise<Metadata> {
  const { docId } = params;
  const document = await DocumentModel.getDocumentWithEvaluations(docId);

  if (!document) {
    return {
      title: "Document not found",
    };
  }

  return {
    title: `Evaluations - ${document.title}`,
    description: `View all evaluations for ${document.title}`,
  };
}

export default async function EvaluationsPage({
  params,
}: EvaluationsPageProps) {
  const { docId } = params;
  const session = await auth();

  // Fetch the document
  const document = await DocumentModel.getDocumentWithEvaluations(docId);

  if (!document) {
    redirect("/docs");
  }

  // Check if the user owns this document
  const isOwner = session?.user?.id === document.submittedById;

  return <EvaluationsClient document={document} isOwner={isOwner} />;
}
