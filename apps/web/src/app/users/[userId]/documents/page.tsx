import { notFound } from "next/navigation";
import { prisma } from "@roast/db";
import DocumentsResults from "@/app/docs/DocumentsResults";
import { DocumentModel } from "@/models/Document";
import { USER_DISPLAY } from "@/shared/constants/constants";
import { auth } from "@/infrastructure/auth/auth";

export const dynamic = 'force-dynamic';

export default async function UserDocumentsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  // Get the user to display their name
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Get session to check privacy permissions
  const session = await auth();

  // Get documents for listing view (respects privacy)
  // For user pages, we want unique documents only (latest version per document)
  const documents = await DocumentModel.getDocumentListings({
    userId,
    requestingUserId: session?.user?.id,
    limit: 50,
    latestVersionOnly: true,
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.name || USER_DISPLAY.GUEST_NAME}'s Documents
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} submitted
                </p>
              </div>
            </div>
          </div>
          
          <DocumentsResults 
            documents={documents} 
            searchQuery=""
            totalCount={documents.length}
            hasSearched={false}
          />
        </div>
      </div>
    </div>
  );
}