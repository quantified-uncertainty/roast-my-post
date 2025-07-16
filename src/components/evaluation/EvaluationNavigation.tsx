import { EvaluationNavigation as BaseEvaluationNavigation } from "@/components/EvaluationNavigation";

interface NavigationItem {
  id: string;
  label: string;
  show: boolean;
  subItems: Array<{
    id: string;
    label: string;
    level: number;
  }>;
}

interface EvaluationNavigationProps {
  items: NavigationItem[];
}

export function EvaluationNavigation({ items }: EvaluationNavigationProps) {
  // Convert items to the expected format
  const navItems = items.map(item => ({
    id: item.id,
    label: item.label,
    subItems: item.subItems || []
  }));

  return (
    <div className="hidden lg:block">
      <div className="sticky top-8">
        <BaseEvaluationNavigation items={navItems} />
      </div>
    </div>
  );
}