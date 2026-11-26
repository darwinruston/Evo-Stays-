// An email address as this app stores and looks it up: no stray spaces, all
// lower case. People type "Jade@Example.com" on one device and
// "jade@example.com" on another and mean the same login, so every place that
// saves or searches for a login's email goes through this. (Passwords are not
// touched: they stay case sensitive.)
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
