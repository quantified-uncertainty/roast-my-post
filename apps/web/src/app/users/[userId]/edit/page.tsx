import { notFound } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import { UserModel } from "@/models/User";

import { EditUserClient } from "./EditUserClient";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();

  if (!session?.user) {
    return notFound();
  }

  // Only allow users to edit their own profile
  if (session.user.id !== resolvedParams.userId) {
    return notFound();
  }

  const user = await UserModel.getUser(resolvedParams.userId);

  if (!user) {
    return notFound();
  }

  return <EditUserClient userId={resolvedParams.userId} />;
}
