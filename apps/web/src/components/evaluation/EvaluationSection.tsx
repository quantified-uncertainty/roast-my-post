import { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  defaultOpen = true,
}: EvaluationSectionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? id : undefined}
      className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <AccordionItem value={id}>
        <AccordionTrigger className="px-6 text-lg text-gray-700">
          <div className="flex w-full items-center justify-between">
            <span>{title}</span>
            {action && <span className="ml-4">{action}</span>}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
