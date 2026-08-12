export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(normalizeUsername(value));
}

export function usernameBaseFromIdentity(name: string, email: string): string {
  const fromName = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  const fromEmail = email
    .split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

  let base = fromName || fromEmail || "user";
  if (base.length < 3) {
    base = `${base}user`.slice(0, 30);
  }
  return base.slice(0, 30);
}
