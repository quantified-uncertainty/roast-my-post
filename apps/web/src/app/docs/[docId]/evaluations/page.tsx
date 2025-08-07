import { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import { DocumentModel } from "@/models/Document";

import EvaluationsClient from "./EvaluationsClient";

interface EvaluationsPageProps {
  params: Promise<{
    docId: string;
  }>;
}

export async function generateMetadata({
  params,
}: EvaluationsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const docId = resolvedParams.docId;
  const document = await DocumentModel.getDocumentWithAllEvaluations(docId);

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
  const resolvedParams = await params;
  const docId = resolvedParams.docId;
  const session = await auth();

  // Fetch the document
  const document = await DocumentModel.getDocumentWithAllEvaluations(docId);

  if (!document) {
    redirect("/docs");
  }

  // Check if the user owns this document
  const isOwner = session?.user?.id === document.submittedById;

  return <EvaluationsClient document={document} isOwner={isOwner} />;
}
