/**
 * AgentIcon component
 * Displays an icon for a system agent based on its ID
 */

interface AgentIconProps {
  agentId?: string;
  size?: number;
  className?: string;
}

/**
 * Maps agent ID to icon filename
 * Strips "system-" prefix from agent ID to get the icon filename
 */
function getIconPath(agentId: string): string | null {
  // Strip "system-" prefix if present
  const iconName = agentId.startsWith('system-')
    ? agentId.replace('system-', '')
    : agentId;

  // Map to icon file path
  return `/agent-icons/${iconName}.svg`;
}

export function AgentIcon({ agentId, size = 20, className = '' }: AgentIconProps) {
  if (!agentId) {
    return null;
  }

  const iconPath = getIconPath(agentId);

  if (!iconPath) {
    return null;
  }

  return (
    <img
      src={iconPath}
      alt=""
      width={size}
      height={size}
      className={`inline-block ${className}`}
      onError={(e) => {
        // Hide icon if file doesn't exist
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
