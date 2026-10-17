// Session token from PIN login; sent as `x-staff-token` on every API call.
const TOKEN_KEY = "tier_staff_token";

export function getStaffToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStaffToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable — the session only lasts for this page load
  }
}
