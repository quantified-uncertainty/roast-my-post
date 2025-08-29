import { Suspense } from "react";
import SearchBar from "./SearchBar";
import DocumentsResults from "./DocumentsResults";
import { DocumentModel } from "@/models/Document";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

interface DocumentsPageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const searchQuery = (await searchParams).search || "";

  // Use the centralized method from DocumentModel
  const documents = await DocumentModel.getDocumentVersionsForListing({
    searchQuery,
    limit: 50,
  });

  const totalCount = documents.length;
  const hasSearched = !!searchQuery.trim() && searchQuery.trim().length >= 2;

  return (
    <>
      <SearchBar searchQuery={searchQuery} showNewButton={true} />

      <Suspense
        fallback={
          <PageLayout>
            <Skeleton className="h-full w-full" />
          </PageLayout>
        }
      >
        <DocumentsResults
          documents={documents}
          searchQuery={searchQuery}
          totalCount={totalCount}
          hasSearched={hasSearched}
        />
      </Suspense>
    </>
  );
}