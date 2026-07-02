export function createUserMetadata(username: string) {
  const displayName = username.trim();

  return {
    username: displayName,
    full_name: displayName,
    name: displayName,
    display_name: displayName,
  };
}
