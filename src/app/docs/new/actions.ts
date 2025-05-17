"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

import { type DocumentInput } from "./schema";

export async function createDocument(data: DocumentInput) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be logged in to create a document");
    }

    // Create the document using the DocumentModel
    const document = await DocumentModel.create({
      ...data,
      submittedById: session.user.id,
    });

    revalidatePath("/docs");
    redirect(`/docs/${document.id}`);
  } catch (error) {
    console.error("Error creating document:", error);
    throw error;
  }
}
