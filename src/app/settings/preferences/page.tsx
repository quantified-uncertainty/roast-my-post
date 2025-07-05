import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PreferencesForm from "./PreferencesForm";

export default async function PreferencesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const userPreferences = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Email Preferences
      </h2>
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <PreferencesForm 
            userId={session.user.id!}
            preferences={userPreferences}
          />
        </div>
      </div>
    </div>
  );
}