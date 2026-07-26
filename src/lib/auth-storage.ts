const ACCESS_TOKEN_KEY = "samra_access_token";
const REFRESH_TOKEN_KEY = "samra_refresh_token";
const ACCESS_EXPIRES_AT_KEY = "samra_access_expires_at";

export const AUTH_EXPIRED_EVENT = "samra:auth-expired";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAccessExpiresAt() {
  const raw = localStorage.getItem(ACCESS_EXPIRES_AT_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function setTokens(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds?: number,
) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  if (typeof expiresInSeconds === "number" && expiresInSeconds > 0) {
    localStorage.setItem(
      ACCESS_EXPIRES_AT_KEY,
      String(Date.now() + expiresInSeconds * 1000),
    );
  } else {
    localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
}

export function hasRefreshToken() {
  return Boolean(getRefreshToken());
}

export function hasStoredTokens() {
  return Boolean(getAccessToken() && getRefreshToken());
}

/** True when access token is missing or expires within the next `skewMs`. */
export function isAccessTokenExpired(skewMs = 60_000) {
  const token = getAccessToken();
  if (!token) return true;

  const expiresAt = getAccessExpiresAt();
  if (!expiresAt) return false;

  return Date.now() >= expiresAt - skewMs;
}

export function notifyAuthExpired() {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}
