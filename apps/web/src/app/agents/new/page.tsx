import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import CreateAgentForm from "./CreateAgentForm";

export default async function NewAgentPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  return <CreateAgentForm />;
}