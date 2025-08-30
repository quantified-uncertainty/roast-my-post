import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { ROUTES } from "@/constants/routes";
import CreateAgentForm from "./CreateAgentForm";

export default async function NewAgentPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(ROUTES.AUTH.SIGNIN);
  }

  return <CreateAgentForm />;
}