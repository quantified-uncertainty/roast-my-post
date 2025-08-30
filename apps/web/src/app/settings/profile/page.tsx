import { redirect } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { ROUTES } from "@/constants/routes";

import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect(ROUTES.AUTH.SIGNIN);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    redirect(ROUTES.AUTH.SIGNIN);
  }

  return <ProfileForm user={user} />;
}
