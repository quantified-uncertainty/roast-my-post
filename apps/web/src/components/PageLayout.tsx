import { cn } from "@/shared/utils/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  background?: "white" | "gray";
}

export function PageLayout({ 
  children, 
  className,
  background = "white" 
}: PageLayoutProps) {
  const bgClass = background === "gray" ? "bg-gray-50" : "bg-white";
  
  return (
    <div className={cn("min-h-screen pb-12", bgClass, className)}>
      {children}
    </div>
  );
}