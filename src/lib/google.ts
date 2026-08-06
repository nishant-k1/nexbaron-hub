import type { Division } from "@/lib/api"

export function getGoogleClientId(division: Division): string | undefined {
  return division === "digital"
    ? import.meta.env.VITE_GOOGLE_CLIENT_ID_DIGITAL
    : import.meta.env.VITE_GOOGLE_CLIENT_ID_PRINT
}

let scriptLoaded = false

export function loadGoogleGis(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.onload = () => { scriptLoaded = true; resolve() }
    document.head.appendChild(script)
  })
}

export function triggerGoogleSignIn(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google
    if (!google?.accounts?.id) {
      reject(new Error("Google sign-in is not available"))
      return
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => {
        resolve(response.credential)
      },
      auto_select: false,
      cancel_on_tap_outside: false,
    })

    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Prompt couldn't show — try the button-based flow instead
        google.accounts.id.renderButton(
          document.getElementById("google-signin-btn")!,
          { theme: "outline", size: "large", type: "standard" }
        )
        resolve("")  // trigger button render
      }
    })
  })
}
