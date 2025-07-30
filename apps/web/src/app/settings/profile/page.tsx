import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ProfileForm } from "./ProfileForm";

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/api/auth/signin");
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
    redirect("/api/auth/signin");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Profile</h1>
      <div className="rounded-lg bg-white shadow">
        <div className="p-6">
          <ProfileForm user={user} />
        </div>
      </div>
    </div>
  );
}
