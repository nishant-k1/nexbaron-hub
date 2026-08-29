export type Division = "digital" | "print"

import { logger } from "./logger"

const API_URL_FALLBACK = import.meta.env.VITE_API_URL || "http://localhost:3001"

export function getApiUrl(division: Division): string {
  const url = division === "digital"
    ? import.meta.env.VITE_API_URL_DIGITAL || API_URL_FALLBACK
    : import.meta.env.VITE_API_URL_PRINT || API_URL_FALLBACK
  return url.replace(/\/$/, "")
}

// Dedicated chat service — serves BOTH divisions from one host (division in path).
const CHAT_URL_FALLBACK = import.meta.env.VITE_CHAT_URL || "https://chat.nexbaron.com"

export function getChatUrl(): string {
  return (import.meta.env.VITE_CHAT_URL || CHAT_URL_FALLBACK).replace(/\/$/, "")
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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface RequestOpts {
  /** Skip error logging (console + Sentry) for best-effort / background calls. */
  silent?: boolean
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, division: Division, opts: RequestOpts = {}): Promise<T> {
  const url = `${getApiUrl(division)}${path}`
  const method = options.method ?? "GET"
  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      headers: { ...getAuthHeaders(division), ...(options.headers ?? {}) },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const err = new ApiError(data?.message ?? `Request failed: ${response.status}`, response.status)
      if (!opts.silent) logger.error("apiRequest failed", { url, method, status: response.status, message: err.message })
      throw err
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (!opts.silent) logger.error("apiRequest failed", {
      url,
      method,
      message: error instanceof Error ? error.message : String(error),
    })
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0)
  }
}

/**
 * Chat requests hit the dedicated chat service (both divisions from one host).
 * Same auth headers as the main API.
 */
export async function chatApiRequest<T>(path: string, options: RequestInit = {}, division: Division, opts: RequestOpts = {}): Promise<T> {
  const url = `${getChatUrl()}${path}`
  const method = options.method ?? "GET"
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(division), ...(options.headers ?? {}) },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const err = new ApiError(data?.message ?? `Chat request failed: ${response.status}`, response.status)
      if (!opts.silent) logger.error("chatApiRequest failed", { url, method, status: response.status, message: err.message })
      throw err
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (!opts.silent) logger.error("chatApiRequest failed", {
      url,
      method,
      message: error instanceof Error ? error.message : String(error),
    })
    throw new ApiError(error instanceof Error ? error.message : "Chat network request failed", 0)
  }
}

export type BillingCycleChoice = "monthly" | "annual"
export interface PlanConfig { planId: string; removedServices: string[]; addOns: Record<string, number>; billingCycle?: BillingCycleChoice }
export interface AuthUser {
  id: string; name: string; email: string | null; phone: string | null
  division: Division; photo?: string | null; planConfig?: PlanConfig | null
}


