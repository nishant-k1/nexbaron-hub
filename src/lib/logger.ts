import * as Sentry from '@sentry/react'

const isDev = import.meta.env.DEV
const dsn = import.meta.env.VITE_SENTRY_DSN

function format(message: string, context?: Record<string, unknown>): string {
  return context && Object.keys(context).length > 0 ? `${message} ${JSON.stringify(context)}` : message
}

/**
 * Custom logger wrapper for the hub frontend.
 * - debug/info: dev-only (suppressed in prod to avoid console noise).
 * - warn/error: always logged to console; error/warn also forwarded to Sentry
 *   when VITE_SENTRY_DSN is configured (graceful no-op otherwise).
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (isDev) console.debug(format(message, context))
  },
  info(message: string, context?: Record<string, unknown>): void {
    if (isDev) console.info(format(message, context))
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(format(message, context))
    if (dsn) Sentry.captureMessage(message, { level: 'warning', ...(context ? { extra: context } : {}) })
  },
  error(message: string, context?: Record<string, unknown>): void {
    console.error(format(message, context))
    if (dsn) {
      const err = context?.error instanceof Error ? context.error : new Error(message)
      Sentry.captureException(err, context ? { extra: context } : undefined)
    }
  },
}
