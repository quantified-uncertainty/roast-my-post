"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function importDocument(url: string, agentIds: string[] = []) {
  try {
    const cookieHeader = (await cookies()).toString();
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/import`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify({ url, importUrl: url, agentIds }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to import document");
    }

    revalidatePath("/docs");
    redirect(`/docs/${data.documentId}/preview`);
  } catch (error) {
    logger.error('❌ Error importing document:', error);
    throw error;
  }
}
