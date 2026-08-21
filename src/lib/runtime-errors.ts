import { logger } from "@/lib/logger"

/**
 * Captures uncaught errors and unhandled promise rejections that escape React
 * Error Boundaries (e.g. async/timer failures). Forwards to the logger (and
 * Sentry when configured).
 */
export function initGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    logger.error("Uncaught error", {
      message: event.message,
      stack: event.error?.stack,
      source: event.filename,
      line: event.lineno,
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason
    logger.error("Unhandled promise rejection", {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    })
  })
}
