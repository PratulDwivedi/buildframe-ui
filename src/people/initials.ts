/** Who an avatar is for. The same shape as the shell's user, so one object serves both. */
export type AvatarUser = { name?: string | null; email?: string | null; avatar?: string | null };

/** From the name, else from the email's local part ("hello+admin@x" -> "HA"), never from the domain. Two letters at most. */
export function initials(user: AvatarUser): string {
  return (
    (user.name?.trim() || user.email?.split("@")[0] || "?")
      .split(/[\s+._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}
