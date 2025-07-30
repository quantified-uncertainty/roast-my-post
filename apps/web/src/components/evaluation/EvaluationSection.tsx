import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ReactNode } from "react";

interface EvaluationSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
}

export function EvaluationSection({
  id,
  title,
  children,
  action,
  defaultOpen = true
}: EvaluationSectionProps) {
  return (
    <CollapsibleSection
      id={id}
      title={title}
      action={action}
      defaultOpen={defaultOpen}
    >
      {children}
    </CollapsibleSection>
  );
}