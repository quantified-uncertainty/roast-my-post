import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WelcomeForm from "./WelcomeForm";

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to RoastMyPost!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Let's complete your profile to get started
          </p>
        </div>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <WelcomeForm userEmail={session.user.email!} userName={session.user.name} />
        </div>
      </div>
    </div>
  );
}