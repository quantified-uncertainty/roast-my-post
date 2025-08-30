import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { ROUTES } from "@/constants/routes";
import CreateDocumentForm from "./CreateDocumentForm";

export default async function NewDocumentPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(ROUTES.AUTH.SIGNIN);
  }

  return <CreateDocumentForm />;
}