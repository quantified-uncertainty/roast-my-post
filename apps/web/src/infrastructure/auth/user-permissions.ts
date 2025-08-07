/**
 * Simple permission helper for user field visibility
 * TODO: Replace with proper permission system (CASL, etc)
 */

export function getUserSelectFields(currentUserId?: string, targetUserId?: string) {
  const isOwnProfile = !!(currentUserId && currentUserId === targetUserId);
  
  return {
    id: true,
    name: true,
    image: true,
    // Only include email for own profile
    email: isOwnProfile,
  };
}

export function getPublicUserFields() {
  return {
    id: true,
    name: true,
    image: true,
    // Never include email in public listings
  };
}