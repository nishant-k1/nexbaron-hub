export type Division = "digital" | "print"

const API_URL_FALLBACK = import.meta.env.VITE_API_URL || "http://localhost:3001"

export function getApiUrl(division: Division): string {
  const url = division === "digital"
    ? import.meta.env.VITE_API_URL_DIGITAL || API_URL_FALLBACK
    : import.meta.env.VITE_API_URL_PRINT || API_URL_FALLBACK
  return url.replace(/\/$/, "")
}

const TOKEN_KEY = "nexbaron-hub-token"

export function authTokenKey(division: Division): string {
  return `${TOKEN_KEY}-${division}`
}

export function getToken(division: Division): string | null {
  return localStorage.getItem(authTokenKey(division))
}

export function setToken(token: string | null, division: Division): void {
  const key = authTokenKey(division)
  if (token) localStorage.setItem(key, token)
  else localStorage.removeItem(key)
}

export function getAuthHeaders(division: Division): Record<string, string> {
  const token = getToken(division)
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, division: Division): Promise<T> {
  const response = await fetch(`${getApiUrl(division)}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(division), ...(options.headers ?? {}) },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.message ?? `Request failed: ${response.status}`)
  return data as T
}

export interface AuthUser {
  id: string; name: string; email: string | null; phone: string | null
  division: Division; photo?: string | null
}
