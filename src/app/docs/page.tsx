import { PrismaClient } from "@prisma/client";

import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage() {
  const prisma = new PrismaClient();
  const docs = await prisma.document.findMany({
    include: { versions: true },
    orderBy: { publishedDate: "desc" },
  });

  // Transform db docs to the shape your UI expects
  const documents = docs.map((doc) => ({
    id: doc.id,
    title: doc.versions[0]?.title || "Untitled",
    author: doc.versions[0]?.authors.join(", ") || "Unknown",
    content: doc.versions[0]?.content || "",
    publishedDate: doc.publishedDate.toISOString(),
    url: doc.versions[0]?.urls[0] || undefined,
    platforms: doc.versions[0]?.platforms || [],
    reviews: [], // You can fill this in if you have review data
    slug: doc.id, // Use id as slug for now
  }));

  return <DocumentsClient documents={documents} />;
}
