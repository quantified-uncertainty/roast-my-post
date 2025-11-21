import type { CommentVariant } from "@roast/ai";
import { CheckCircleIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface CommentVariantIndicatorProps {
  variant: CommentVariant | null | undefined;
  size?: "sm" | "md" | "lg";
  isHovered?: boolean;
  className?: string;
}

/**
 * Displays a visual indicator (icon with colored background) for a comment variant
 * 
 * Sizes:
 * - sm: 5x5 (h-5 w-5) - used in comment lists
 * - md: 6x6 (h-6 w-6) - used in modals
 * - lg: custom - can be styled with className
 */
export function CommentVariantIndicator({
  variant,
  size = "md",
  isHovered = false,
  className,
}: CommentVariantIndicatorProps) {
  const variantType = variant || "info"; // Default to info if not set
  
  let bgColor = "bg-blue-500";
  let iconContent: React.ReactNode;
  
  // Determine background color based on variant and hover state
  switch (variantType) {
    case "error":
      bgColor = isHovered ? "bg-red-500" : "bg-red-400";
      iconContent = <XMarkIcon className="text-white" />;
      break;
    case "warning":
      bgColor = isHovered ? "bg-orange-500" : "bg-orange-400";
      iconContent = <span className="text-white font-bold leading-none">!</span>;
      break;
    case "nitpick":
      bgColor = isHovered ? "bg-fuchsia-500" : "bg-fuchsia-300";
      iconContent = <span className="text-white font-bold leading-none">·</span>;
      break;
    case "success":
      bgColor = isHovered ? "bg-green-500" : "bg-green-300";
      iconContent = <CheckIcon className="text-white" />;
      break;
    case "debug":
      bgColor = isHovered ? "bg-gray-500" : "bg-gray-400";
      iconContent = <span className="text-white font-bold leading-none text-xs">d</span>;
      break;
    case "info":
    default:
      bgColor = isHovered ? "bg-blue-500" : "bg-blue-400";
      iconContent = <span className="text-white font-bold leading-none">i</span>;
      break;
  }
  
  // Determine size classes
  let sizeClasses = "";
  let iconSizeClass = "";
  let textSizeClass = "";
  
  switch (size) {
    case "sm":
      sizeClasses = "h-5 w-5";
      iconSizeClass = "h-3.5 w-3.5";
      textSizeClass = "text-xs";
      break;
    case "md":
      sizeClasses = "h-6 w-6";
      iconSizeClass = "h-5 w-5";
      textSizeClass = "text-base";
      break;
    case "lg":
      sizeClasses = "h-8 w-8";
      iconSizeClass = "h-6 w-6";
      textSizeClass = "text-lg";
      break;
  }
  
  // Clone icon element with size class if it's an icon component
  let content = iconContent;
  if (typeof iconContent === 'object' && iconContent && 'type' in iconContent) {
    const IconComponent = iconContent.type as any;
    if (IconComponent === XMarkIcon || IconComponent === CheckIcon || IconComponent === CheckCircleIcon) {
      content = <IconComponent className={`${iconSizeClass} text-white`} />;
    } else if (iconContent.type === 'span') {
      // For text content, add text size
      content = <span className={`text-white font-bold leading-none ${textSizeClass}`}>{(iconContent as any).props.children}</span>;
    }
  }
  
  return (
    <div
      className={`${sizeClasses} ${bgColor} rounded-sm flex flex-shrink-0 items-center justify-center ${className || ""}`}
      aria-label={`${variantType} indicator`}
    >
      {content}
    </div>
  );
}

/**
 * Variant for EvaluationComments - uses CheckCircleIcon for success
 */
export function CommentVariantIndicatorCompact({
  variant,
  className,
}: Omit<CommentVariantIndicatorProps, "size" | "isHovered">) {
  const variantType = variant || "info";
  
  let bgColor = "bg-blue-400";
  let content: React.ReactNode;

  switch (variantType) {
    case "error":
      bgColor = "bg-red-500";
      content = <XMarkIcon className="h-3.5 w-3.5 text-white" />;
      break;
    case "warning":
      bgColor = "bg-amber-500";
      content = <span className="text-white font-bold text-xs leading-none">!</span>;
      break;
    case "nitpick":
      bgColor = "bg-fuchsia-500";
      content = <span className="text-white font-bold text-xs leading-none">·</span>;
      break;
    case "success":
      bgColor = "bg-green-500";
      content = <CheckCircleIcon className="h-3.5 w-3.5 text-white" />;
      break;
    case "info":
    case "debug":
    default:
      bgColor = "bg-blue-500";
      content = <span className="text-white font-bold text-xs leading-none">i</span>;
      break;
  }

  return (
    <div className={`h-5 w-5 rounded-sm ${bgColor} flex flex-shrink-0 items-center justify-center ${className || ""}`}>
      {content}
    </div>
  );
}

