import DocumentsLayoutClient from "@/components/DocumentsLayoutClient";
import { DocumentModel } from "@/models/Document";
import { auth } from "@/infrastructure/auth/auth";

export const dynamic = "force-dynamic";

interface DocumentsPageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const session = await auth();
  const searchQuery = (await searchParams).search || "";

  // Get only public documents for the public docs page
  const documents = await DocumentModel.getDocumentListings({
    searchQuery,
    // Don't pass requestingUserId to ensure only public docs are shown
    limit: 50,
  });

  const totalCount = documents.length;
  const hasSearched = !!searchQuery.trim() && searchQuery.trim().length >= 2;

  return (
    <DocumentsLayoutClient
      documents={documents}
      searchQuery={searchQuery}
      totalCount={totalCount}
      hasSearched={hasSearched}
      title="Public Documents"
      subtitle="Explore and review community documents"
      showPrivacyBadges={false}
      currentUserId={session?.user?.id}
    />
  );
}