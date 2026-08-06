import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BrandMark } from "@/components/brand/BrandMark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/auth/auth-context"
import { apiRequest, type AuthUser, type Division } from "@/lib/api"

const COPY: Record<Division, { title: string; tagline: string }> = {
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
  const { division } = useParams<{ division: Division }>()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)

  if (!division) return null
  const copy = COPY[division]

  const requestOtp = async () => {
    if (!email.trim()) { setError("Please enter your email."); return }
    setLoading(true); setError(null)
    try {
      const data = await apiRequest<{ devCode?: string }>(`/${division}/auth/request-otp`, {
        method: "POST", body: JSON.stringify({ channel: "email", target: email, name: "" }),
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
        method: "POST", body: JSON.stringify({ channel: "email", target: email, code, name: "" }),
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
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (otpSent) { setOtpSent(false); setDevCode(null) } }}
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
