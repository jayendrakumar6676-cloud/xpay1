// Allowed candidate credentials.
//
// NOTE: These credentials are bundled into the frontend and therefore
// visible to anyone who inspects the page source. For a production
// proctored-exam deployment this list should be moved behind a real
// authentication endpoint (FastAPI + hashed passwords). For now this
// matches the user's explicit request.

export interface Credential {
  username: string;
  password: string;
  /** Optional display name (defaults to username before the @). */
  displayName?: string;
}

export const VALID_CREDENTIALS: Credential[] = [
  { username: "himavanthkodi@gmail.com", password: "20041007", displayName: "Himavanth Kodi" },
  { username: "h1", password: "h2", displayName: "Test User" },
];

export interface ValidatedCandidate {
  username: string;          // canonical (matched) username
  displayName: string;       // for "Welcome, Mr. <displayName>"
}

/**
 * Returns the matched credential (canonical username + display name) when
 * the supplied credentials match a valid candidate. Returns null otherwise.
 *
 * Matching is case-insensitive on the username and trims surrounding
 * whitespace, but the password must match exactly.
 */
export function validateCredentials(
  username: string,
  password: string,
): ValidatedCandidate | null {
  const u = username.trim().toLowerCase();
  if (!u || !password) return null;
  const found = VALID_CREDENTIALS.find(
    (c) => c.username.toLowerCase() === u && c.password === password,
  );
  if (!found) return null;
  const display =
    found.displayName?.trim() ||
    found.username.split("@")[0] ||
    found.username;
  return { username: found.username, displayName: display };
}
