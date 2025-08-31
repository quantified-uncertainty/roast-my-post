import { Suspense } from "react";
import SearchBar from "../docs/SearchBar";
import DocumentsResults from "../docs/DocumentsResults";
import { DocumentModel } from "@/models/Document";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Get only the current user's documents
  const documents = await DocumentModel.getDocumentListings({
    searchQuery,
    limit: 50,
    userId: session.user.id,
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