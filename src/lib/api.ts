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

export async function apiRequest<T>(path: string, options: RequestInit = {}, division: Division): Promise<T> {
  const url = `${getApiUrl(division)}${path}`
  const method = options.method ?? "GET"
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(division), ...(options.headers ?? {}) },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const err = new ApiError(data?.message ?? `Request failed: ${response.status}`, response.status)
      logger.error("apiRequest failed", { url, method, status: response.status, message: err.message })
      throw err
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    logger.error("apiRequest failed", {
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
export async function chatApiRequest<T>(path: string, options: RequestInit = {}, division: Division): Promise<T> {
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
      logger.error("chatApiRequest failed", { url, method, status: response.status, message: err.message })
      throw err
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    logger.error("chatApiRequest failed", {
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

// ─── Hub Types ───

export type PipelineStage = "inquiry" | "proposal" | "commit" | "build" | "delivery"

export interface ProjectSummary {
  projectId: string
  stage: PipelineStage
  leadId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  plan?: string
  source: string
  leadStatus: string
  latestQuote: { id: string; status: string; price?: number } | null
  latestOrder: { id: string; status: string; amount: number; amountPaid: number; milestones: { done: number; total: number } } | null
  unreadChats: number
  lastActivity: string | null
  createdAt: string
}

export interface ProjectDetail {
  lead: {
    _id: string
    name: string
    email?: string
    phone?: string
    plan?: string
    status: string
    message?: string
  }
  quotes: {
    _id: string
    quoteNumber: string
    status: string
    selection: Record<string, unknown>
    response?: { price?: number; message?: string; sentAt?: string } | null
  }[]
  orders: {
    _id: string
    status: string
    amount: number
    amountPaid: number
    launchDate?: string
    milestones?: { key: string; label: string; dayLabel: string; status: string; date?: string }[]
    invoiceNumber?: string
  }[]
  chat: { _id: string; sender: string; message: string; createdAt: string }[]
  stage: PipelineStage
}

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  inquiry: "Inquiry",
  proposal: "Proposal",
  commit: "Commit",
  build: "Build",
  delivery: "Delivery",
}

export const PIPELINE_STAGES: PipelineStage[] = ["inquiry", "proposal", "commit", "build", "delivery"]

// ─── Hub API Functions ───

export async function fetchMyProjects(division: Division): Promise<{ projects: ProjectSummary[]; pipeline: Record<string, number> }> {
  return apiRequest(`/${division}/projects`, {}, division)
}

export async function fetchMyProject(division: Division, projectId: string): Promise<{ project: ProjectDetail }> {
  return apiRequest(`/${division}/projects/${projectId}`, {}, division)
}

export async function fetchMyOrders(division: Division): Promise<{ orders: any[] }> {
  return apiRequest(`/${division}/payments/orders/mine`, {}, division)
}
