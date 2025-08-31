import { LockClosedIcon, GlobeAltIcon } from "@heroicons/react/20/solid";

interface PrivacyBadgeProps {
  isPrivate: boolean | undefined;
  variant?: "badge" | "icon" | "text";
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function PrivacyBadge({ 
  isPrivate, 
  variant = "badge",
  size = "sm",
  className = "" 
}: PrivacyBadgeProps) {
  const sizeClasses = {
    xs: "text-xs px-2 py-0.5",
    sm: "text-xs px-2.5 py-0.5",
    md: "text-sm px-3 py-1"
  };

  const iconSizeClasses = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4"
  };

  if (variant === "icon") {
    return isPrivate ? (
      <LockClosedIcon 
        className={`${iconSizeClasses[size]} text-gray-400 flex-shrink-0 ${className}`} 
        title="Private document" 
      />
    ) : (
      <GlobeAltIcon 
        className={`${iconSizeClasses[size]} text-gray-400 flex-shrink-0 ${className}`} 
        title="Public document" 
      />
    );
  }

  if (variant === "text") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        {isPrivate ? (
          <>
            <LockClosedIcon 
              className={`${iconSizeClasses[size]} text-gray-400 flex-shrink-0`} 
              title="Private document" 
            />
            <span className="text-sm text-gray-600">Private</span>
          </>
        ) : (
          <>
            <GlobeAltIcon 
              className={`${iconSizeClasses[size]} text-gray-400 flex-shrink-0`} 
              title="Public document" 
            />
            <span className="text-sm text-gray-600">Public</span>
          </>
        )}
      </span>
    );
  }

  // Default badge variant
  if (isPrivate) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 font-medium text-gray-600 ${sizeClasses[size]} ${className}`}>
        <LockClosedIcon className={iconSizeClasses[size]} />
        Private
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 font-medium text-green-700 ${sizeClasses[size]} ${className}`}>
      <GlobeAltIcon className={iconSizeClasses[size]} />
      Public
    </span>
  );
}