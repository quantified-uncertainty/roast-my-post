"use server";

import { nanoid } from "nanoid";
import { createSafeActionClient } from "next-safe-action";

import { auth } from "@/lib/auth";
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
      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("User must be logged in to create a document");
      }

      // Generate a nanoid for the document id
      const id = nanoid(16);

      // Create the document
      const document = await prisma.document.create({
        data: {
          id, // use nanoid as the id
          publishedDate: new Date(),
          submittedById: session.user.id,
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

      // Create slug from title (optional, or you can use nanoid for slug too)
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
