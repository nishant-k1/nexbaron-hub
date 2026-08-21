import * as Sentry from '@sentry/react'

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    // Graceful degrade: no Sentry account configured. The app logs locally via the console.
    return
  }
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    release: import.meta.env.VITE_SENTRY_RELEASE,
  })
}
