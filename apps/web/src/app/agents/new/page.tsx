import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import NewAgentClient from "./NewAgentClient";

export default async function NewAgentPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  return <NewAgentClient />;
}