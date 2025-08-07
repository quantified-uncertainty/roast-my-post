import { notFound } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import DocumentsClient from "@/app/docs/DocumentsClient";
import { DocumentModel } from "@/models/Document";
import { USER_DISPLAY } from "@/shared/constants/constants";

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

  // Get documents for this user efficiently
  const userDocuments = await DocumentModel.getUserDocumentsWithEvaluations(userId);

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
                  {userDocuments.length} document{userDocuments.length !== 1 ? 's' : ''} submitted
                </p>
              </div>
            </div>
          </div>
          
          <DocumentsClient 
            documents={userDocuments} 
            showNewButton={false}
          />
        </div>
      </div>
    </div>
  );
}