import { BookOpen } from "lucide-react";

const iconMap: Record<string, typeof BookOpen> = {
  "book-open": BookOpen,
};

export function getIcon(iconName: string): typeof BookOpen {
  return iconMap[iconName] || BookOpen;
}
