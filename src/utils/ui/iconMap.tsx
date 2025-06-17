import {
  BeakerIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  CpuChipIcon,
  DocumentTextIcon,
  HeartIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

// Map icon name to component
export const getIcon = (iconName: string) => {
  const iconMap: Record<string, React.ElementType> = {
    BeakerIcon,
    BoltIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    ClipboardDocumentCheckIcon,
    CodeBracketIcon,
    CpuChipIcon,
    DocumentTextIcon,
    HeartIcon,
    LightBulbIcon,
    MagnifyingGlassIcon,
    ScaleIcon,
  };

  return iconMap[iconName] || DocumentTextIcon;
};
