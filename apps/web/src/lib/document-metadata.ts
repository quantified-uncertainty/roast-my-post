import type { Metadata } from "next";
import { auth } from "@/infrastructure/auth/auth";
import { PrivacyService } from "@/infrastructure/auth/privacy-service";
import { prisma } from "@/infrastructure/database/prisma";

interface DocumentMetadataOptions {
  suffix?: string;
  fallbackTitle?: string;
}

/**
 * Generate metadata for document pages with privacy checks.
 * This ensures private document information is never leaked through page metadata.
 * 
 * @param docId - The document ID to generate metadata for
 * @param options - Optional configuration for metadata generation
 * @returns Metadata object with appropriate title and description
 */
export async function generateDocumentMetadata(
  docId: string,
  options?: DocumentMetadataOptions
): Promise<Metadata> {
  // Check if user has permission to view this document
  const session = await auth();
  const canView = await PrivacyService.canViewDocument(docId, session?.user?.id);
  
  // Return generic metadata if access is denied to prevent information leakage
  if (!canView) {
    return {
      title: options?.fallbackTitle || "Document Not Found - RoastMyPost",
      // Prevent indexing of pages that user cannot access
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  
  // Query for document metadata
  const document = await prisma.document.findUnique({
    where: { id: docId },
    select: {
      isPrivate: true,
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          title: true,
          authors: true,
        },
      },
    },
  });

  // Handle case where document doesn't exist or has no versions
  if (!document || !document.versions[0]) {
    return {
      title: options?.fallbackTitle || "Document Not Found - RoastMyPost",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Format title components
  const version = document.versions[0];
  const title = version.title || "Untitled Document";
  const authorPart = version.authors && version.authors.length > 0
    ? ` by ${version.authors.join(", ")}`
    : "";
  const suffixPart = options?.suffix ? ` - ${options.suffix}` : "";

  // Generate description based on context
  let description: string;
  if (options?.suffix === "Reader") {
    description = `Read "${title}" with AI evaluations`;
  } else {
    description = `View and manage evaluations for "${title}"`;
  }

  return {
    title: `${title}${authorPart}${suffixPart} - RoastMyPost`,
    description,
    // Set robots meta based on document privacy
    // Private documents should not be indexed by search engines
    robots: {
      index: !document.isPrivate,
      follow: !document.isPrivate,
      ...(document.isPrivate && {
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
      }),
    },
  };
}