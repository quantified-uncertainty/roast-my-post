"use server";

import { createSafeActionClient } from "next-safe-action";

import { PrismaClient } from "@prisma/client";

import { type DocumentInput, documentSchema } from "./schema";

// Setup next-safe-action
const actionClient = createSafeActionClient();

// Server action for creating a document
export const createDocument = actionClient
  .schema(documentSchema)
  .action(async ({ parsedInput: data }: { parsedInput: DocumentInput }) => {
    try {
      const prisma = new PrismaClient();

      // Create the document
      const document = await prisma.document.create({
        data: {
          publishedDate: new Date(),
          versions: {
            create: {
              version: 1,
              title: data.title,
              authors: data.authors.split(",").map((a: string) => a.trim()),
              urls: data.urls
                ? data.urls.split(",").map((u: string) => u.trim())
                : [],
              platforms: data.platforms
                ? data.platforms.split(",").map((p: string) => p.trim())
                : [],
              intendedAgents: data.intendedAgents
                ? data.intendedAgents.split(",").map((a: string) => a.trim())
                : [],
              content: data.content,
            },
          },
        },
        include: {
          versions: {
            orderBy: {
              version: "desc",
            },
            take: 1,
          },
        },
      });

      await prisma.$disconnect();

      // Create slug from title
      const slug = data.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-");

      return {
        success: true,
        document,
        slug,
      };
    } catch (error) {
      console.error("Error creating document:", error);
      return {
        success: false,
        error: "Failed to create document",
      };
    }
  });
