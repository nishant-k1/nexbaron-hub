import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BrandMark } from "@/components/brand/BrandMark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/auth/auth-context"
import { apiRequest, type AuthUser } from "@/lib/api"
import { getGoogleClientId, loadGoogleGis, triggerGoogleSignIn } from "@/lib/google"

type Channel = "email" | "phone"

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
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [channel, setChannel] = useState<Channel>("email")
  const [target, setTarget] = useState("")
  const [code, setCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)

  if (division !== "digital" && division !== "print") return null
  const copy = COPY[division]
  const googleClientId = getGoogleClientId(division)
  const isEmail = channel === "email"

  useEffect(() => { loadGoogleGis() }, [])

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
      navigate(`/${division}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed.")
    } finally { setLoading(false) }
  }

  const requestOtp = async () => {
    if (!target.trim()) {
      setError(isEmail ? "Please enter your email." : "Please enter your phone number.")
      return
    }
    setLoading(true); setError(null)
    try {
      const data = await apiRequest<{ devCode?: string }>(`/${division}/auth/request-otp`, {
        method: "POST", body: JSON.stringify({ channel, target, name: "" }),
      }, division)
      setOtpSent(true); setDevCode(data.devCode ?? null)
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send code.") }
    finally { setLoading(false) }
  }

  const verifyCode = async () => {
    if (!code.trim()) { setError("Please enter the verification code."); return }
    setLoading(true); setError(null)
    try {
      const data = await apiRequest<{ token: string; user: AuthUser }>(`/${division}/auth/verify`, {
        method: "POST", body: JSON.stringify({ channel, target, code, name: "" }),
      }, division)
      signIn(data.token, data.user)
      navigate(`/${division}`, { replace: true })
    } catch (e) { setError(e instanceof Error ? e.message : "Verification failed.") }
    finally { setLoading(false) }
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
              <h2 className="text-2xl font-bold text-heading mb-1">Sign in</h2>
              <p className="text-sm text-muted">Access your {division} account.</p>
            </div>

            <form onSubmit={e => { e.preventDefault(); otpSent ? verifyCode() : requestOtp() }} className="space-y-4">
              {googleClientId && (
                <>
                  <Button type="button" className="w-full" size="lg" onClick={handleGoogleSignIn} disabled={loading}>
                    <span className="text-base leading-none font-bold mr-2">G</span>
                    Continue with Google
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-mono text-muted">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </>
              )}

              {/* Channel toggle */}
              <div className="flex rounded-lg bg-neutral-surface border border-border p-1">
                <button
                  type="button"
                  onClick={() => { setChannel("email"); setTarget(""); setOtpSent(false); setDevCode(null) }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${channel === "email" ? "bg-accent text-accent-fg" : "text-muted hover:text-heading"}`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setChannel("phone"); setTarget(""); setOtpSent(false); setDevCode(null) }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${channel === "phone" ? "bg-accent text-accent-fg" : "text-muted hover:text-heading"}`}
                >
                  Phone
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target">{isEmail ? "Email address" : "Phone number"}</Label>
                <Input
                  id="target"
                  type={isEmail ? "email" : "tel"}
                  autoComplete={isEmail ? "email" : "tel"}
                  placeholder={isEmail ? "you@business.com" : "10-digit mobile number"}
                  value={target}
                  onChange={e => { setTarget(e.target.value); if (otpSent) { setOtpSent(false); setDevCode(null) } }}
                  disabled={otpSent}
                  required
                />
              </div>

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

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Please wait…" : otpSent ? "Verify & Sign In" : "Send verification code"}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center lg:hidden text-xs text-muted">Nexbaron Hub · Customer portal</p>
      </div>
    </div>
  )
}
