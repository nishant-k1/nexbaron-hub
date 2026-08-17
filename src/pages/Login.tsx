import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BrandMark } from "@/components/brand/BrandMark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/auth/auth-context"
import { apiRequest, type AuthUser } from "@/lib/api"
import { getGoogleClientId, loadGoogleGis, triggerGoogleSignIn } from "@/lib/google"

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.nexbaron.com"

const COPY: Record<"digital" | "print", { title: string; tagline: string }> = {
  digital: {
    title: "Digital Hub",
    tagline: "Your website, your plan, your growth — all in one place.",
  },
  print: {
    title: "Print Hub",
    tagline: "Track orders, download invoices, manage your print business.",
  },
}

export default function Login() {
  const { division } = useParams<{ division: string }>()
  const { signIn, user, initialized } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [target, setTarget] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [code, setCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)

  useEffect(() => { loadGoogleGis() }, [])

  useEffect(() => {
    if (initialized && user && (division === "digital" || division === "print")) {
      navigate(`/${division}`, { replace: true })
    }
  }, [initialized, user, division, navigate])

  if (division !== "digital" && division !== "print") return null
  if (!initialized) return null
  if (user) return null

  const copy = COPY[division]
  const googleClientId = getGoogleClientId(division)
  const isRegister = mode === "register"

  const handleGoogleSignIn = async () => {
    if (!googleClientId) { setError("Google sign-in is not configured."); return }
    setLoading(true); setError(null)
    try {
      const credential = await triggerGoogleSignIn(googleClientId)
      if (!credential) return
      const data = await apiRequest<{ token: string; user: AuthUser }>(
        `/${division}/auth/google`,
        { method: "POST", body: JSON.stringify({ credential }) },
        division,
      )
      signIn(data.token, data.user)
      window.location.assign(`${SITE_URL}/${division}?token=${encodeURIComponent(data.token)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed.")
    } finally { setLoading(false) }
  }

  const requestOtp = async () => {
    if (!target.trim()) { setError("Please enter your email."); return }
    if (isRegister && !name.trim()) { setError("Please enter your name."); return }
    setLoading(true); setError(null)
    try {
      const purpose = isRegister ? "signup" : "login"
      const data = await apiRequest<{ devCode?: string }>(`/${division}/auth/request-otp`, {
        method: "POST", body: JSON.stringify({ channel: "email", target, name: name.trim(), purpose }),
      }, division)
      setOtpSent(true); setDevCode(data.devCode ?? null)
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send code.") }
    finally { setLoading(false) }
  }

  const verifyCode = async () => {
    if (!code.trim()) { setError("Please enter the verification code."); return }
    setLoading(true); setError(null)
    try {
      const purpose = isRegister ? "signup" : "login"
      const data = await apiRequest<{ token: string; user: AuthUser }>(`/${division}/auth/verify`, {
        method: "POST", body: JSON.stringify({ channel: "email", target, code, name: name.trim(), purpose }),
      }, division)
      signIn(data.token, data.user)
      window.location.assign(`${SITE_URL}/${division}?token=${encodeURIComponent(data.token)}`)
    } catch (e) { setError(e instanceof Error ? e.message : "Verification failed.") }
    finally { setLoading(false) }
  }

  const switchMode = () => {
    setMode(m => m === "login" ? "register" : "login")
    setOtpSent(false); setCode(""); setDevCode(null); setError(null)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-neutral-bg">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            background:
              division === "digital"
                ? "radial-gradient(circle at 20% 20%, #2dd4bf 0%, transparent 55%), radial-gradient(circle at 80% 80%, #22d3ee 0%, transparent 50%)"
                : "radial-gradient(circle at 30% 20%, #fbbf24 0%, transparent 55%), radial-gradient(circle at 70% 85%, #f97316 0%, transparent 50%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <BrandMark size={44} />
          <span className="text-xl font-bold text-heading">Nexbaron</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold text-heading leading-tight mb-4">{copy.title}</h1>
          <p className="text-lg text-muted max-w-sm">{copy.tagline}</p>
        </div>
        <p className="relative text-xs text-muted">Nexbaron Hub · Customer portal</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col px-6 py-8 lg:px-16">
        <div className="flex items-center gap-3 lg:hidden mb-10">
          <BrandMark size={40} />
          <span className="text-lg font-bold text-heading">
            Nexbaron Hub <span className="capitalize text-accent">· {division}</span>
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-heading mb-1">{isRegister ? "Create account" : "Sign in"}</h2>
              <p className="text-sm text-muted">
                {isRegister
                  ? "Set up your hub account to manage your plan, track progress, and make payments."
                  : "Enter your email or phone to receive a one-time code."}
              </p>
            </div>

            <form onSubmit={e => { e.preventDefault(); if (otpSent) verifyCode(); else requestOtp() }} className="space-y-4">
              {isRegister && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name *</Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="target">Email address *</Label>
                <Input
                  id="target"
                  type="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  value={target}
                  onChange={e => { setTarget(e.target.value); if (otpSent) { setOtpSent(false); setDevCode(null) } }}
                  disabled={otpSent}
                  required
                />
                <p className="text-xs text-muted">
                  {isRegister
                    ? "Use the same email you gave when choosing a plan, registering, contacting us, or chatting on WhatsApp — we link your account to existing conversations."
                    : "Use the same email or phone you gave when choosing a plan, registering, contacting us, or chatting on WhatsApp — we link your account to existing conversations."}
                </p>
              </div>

              {isRegister && (
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              )}

              {isRegister && (
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company / Business Name</Label>
                  <Input
                    id="company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Your business name"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                  />
                </div>
              )}

              {otpSent && (
                <div className="space-y-1.5">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    className="text-center tracking-widest"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    autoFocus
                    required
                  />
                  {devCode && (
                    <p className="text-xs text-accent mt-1">
                      Dev mode code: <span className="font-mono font-bold">{devCode}</span>
                    </p>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button type="submit" className="cursor-pointer w-full" size="lg" disabled={loading}>
                {loading ? "Please wait…" : otpSent ? (isRegister ? "Verify & Create Account" : "Verify & Sign In") : "Send code"}
              </Button>
            </form>

            {/* Google separator */}
            {googleClientId && (
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted">or continue with</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-muted hover:bg-neutral-surface hover:text-heading transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            )}

            {/* Mode toggle */}
            <p className="mt-6 text-center text-sm text-muted">
              {isRegister ? (
                <>Already have an account?{" "}
                  <button type="button" onClick={switchMode} className="cursor-pointer text-accent hover:underline font-medium">
                    Sign in
                  </button>
                </>
              ) : (
                <>New here?{" "}
                  <button type="button" onClick={switchMode} className="cursor-pointer text-accent hover:underline font-medium">
                    Create an account
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        <p className="text-center lg:hidden text-xs text-muted">Nexbaron Hub · Customer portal</p>
      </div>
    </div>
  )
}
