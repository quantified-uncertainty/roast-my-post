import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/infrastructure/auth/auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    redirect("/");
  }
  
  return <>{children}</>;
}