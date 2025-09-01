import { Suspense } from "react";
import SearchBar from "./SearchBar";
import DocumentsResults from "./DocumentsResults";
import { DocumentModel } from "@/models/Document";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
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
  const searchQuery = (await searchParams).search || "";
  const session = await auth();
  const isLoggedIn = !!session?.user;

  // Get only public documents for the public docs page
  const documents = await DocumentModel.getDocumentListings({
    searchQuery,
    // Don't pass requestingUserId to ensure only public docs are shown
    limit: 50,
  });

  const totalCount = documents.length;
  const hasSearched = !!searchQuery.trim() && searchQuery.trim().length >= 2;

  return (
    <>
      <SearchBar searchQuery={searchQuery} showNewButton={false} />

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