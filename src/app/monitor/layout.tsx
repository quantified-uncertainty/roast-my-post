import AdminLayout from "./admin-layout";
import ClientLayout from "./client-layout";

export const metadata = {
  title: "System Monitor",
  description: "Monitor system performance and job processing",
};

interface MonitorLayoutProps {
  children: React.ReactNode;
}

export default function MonitorLayout({ children }: MonitorLayoutProps) {
  return (
    <AdminLayout>
      <ClientLayout>{children}</ClientLayout>
    </AdminLayout>
  );
}