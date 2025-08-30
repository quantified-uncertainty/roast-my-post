import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { SettingsNav } from "./SettingsNav";
import { ROUTES } from "@/constants/routes";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect(ROUTES.AUTH.SIGNIN);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Settings</h2>
            <p className="text-sm text-gray-500">{session.user.email}</p>
          </div>
          
          <SettingsNav />
        </div>

        {/* Main content */}
        <div className="flex-1">
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}