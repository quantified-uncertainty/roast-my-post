import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import NewDocumentClient from "./NewDocumentClient";

export default async function NewDocumentPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  return <NewDocumentClient />;
}