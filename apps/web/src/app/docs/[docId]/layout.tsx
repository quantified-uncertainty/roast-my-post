import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { PrivacyService } from "@/infrastructure/auth/privacy-service";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ docId: string }>;
}

/**
 * Layout component that enforces privacy checks for all routes under /docs/[docId]/*
 * This ensures that private documents can only be viewed by their owners
 */
export default async function DocumentLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params;
  const { docId } = resolvedParams;

  // Get current user
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Check if user can view this document (privacy check)
  const canView = await PrivacyService.canViewDocument(docId, currentUserId);
  
  if (!canView) {
    // Return 404 to prevent information leakage
    // We use 404 instead of 403 so attackers can't determine if a document exists
    notFound();
  }

  // If user has access, render the children
  return <>{children}</>;
}