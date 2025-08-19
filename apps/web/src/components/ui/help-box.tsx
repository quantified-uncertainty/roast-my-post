import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpBoxProps {
  children: ReactNode;
  variant?: "info" | "warning" | "success" | "error";
  className?: string;
}

const variantStyles = {
  info: "border-blue-200 bg-blue-50",
  warning: "border-yellow-200 bg-yellow-50",
  success: "border-green-200 bg-green-50",
  error: "border-red-200 bg-red-50",
};

const variantIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

const variantTextColors = {
  info: "text-blue-800",
  warning: "text-yellow-800",
  success: "text-green-800",
  error: "text-red-800",
};

export function HelpBox({
  children,
  variant = "info",
  className,
}: HelpBoxProps) {
  const Icon = variantIcons[variant];

  return (
    <Card className={cn("mt-4", variantStyles[variant], className)}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className={cn("text-sm", variantTextColors[variant])}>
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
