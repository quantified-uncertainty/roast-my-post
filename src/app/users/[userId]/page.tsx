import { notFound } from "next/navigation";

import UserDetail from "@/components/UserDetail";
import { auth } from "@/lib/auth";
import { UserModel } from "@/models/User";

export default async function UserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();
  const currentUserId = session?.user?.id;

  const user = await UserModel.getUser(resolvedParams.userId, currentUserId);

  if (!user) {
    return notFound();
  }

  return <UserDetail user={user} />;
}
