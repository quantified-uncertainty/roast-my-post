import DocumentsLayoutClient from "@/components/DocumentsLayoutClient";
import { DocumentModel } from "@/models/Document";
import { auth } from "@/infrastructure/auth/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface MyDocumentsPageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function MyDocumentsPage({
  searchParams,
}: MyDocumentsPageProps) {
  const session = await auth();
  
  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const searchQuery = (await searchParams).search || "";

  // Get only the current user's documents (both public and private)
  const documents = await DocumentModel.getDocumentListings({
    searchQuery,
    limit: 50,
    userId: session.user.id,
    requestingUserId: session.user.id,
  });

  const totalCount = documents.length;
  const hasSearched = !!searchQuery.trim() && searchQuery.trim().length >= 2;

  return (
    <DocumentsLayoutClient
      documents={documents}
      searchQuery={searchQuery}
      totalCount={totalCount}
      hasSearched={hasSearched}
      title="Your Documents"
      subtitle="Manage and review your uploaded documents"
      showPrivacyBadges={true}
      currentUserId={session.user.id}
    />
  );
}