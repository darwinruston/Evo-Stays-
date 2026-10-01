import { PmsAuthError } from "@/lib/pms/errors";

type TokenResult = { token: string; expiresInSeconds: number | null };

// Shared POST-for-a-token boilerplate for Hostaway and Guesty's
// client_credentials-shaped grants -- the two differ in body encoding
// (Hostaway: form-urlencoded; Guesty: JSON) and token field casing
// (access_token vs accessToken), both handled here so each adapter just
// supplies its own url/headers/body. No caching here -- see each adapter's
// own getToken for whether it needs one (Guesty's documented 5-tokens-per-
// 24h quota makes caching a correctness requirement there; Hostaway's
// 24-month token life doesn't).
export async function requestClientCredentialsToken(options: {
  url: string;
  headers: Record<string, string>;
  body: BodyInit;
  providerName: string;
}): Promise<TokenResult> {
  const res = await fetch(options.url, { method: "POST", headers: options.headers, body: options.body });
  const data = (await res.json().catch(() => null)) as
    | { access_token?: string; accessToken?: string; expires_in?: number }
    | null;
  const token = data?.access_token ?? data?.accessToken;
  if (!res.ok || !token) {
    if (res.status === 401 || res.status === 403) {
      throw new PmsAuthError(`${options.providerName} rejected the credentials (${res.status})`);
    }
    throw new Error(`${options.providerName} token request failed (${res.status})`);
  }
  return { token, expiresInSeconds: data?.expires_in ?? null };
}
