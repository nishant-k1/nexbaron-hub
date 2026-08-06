import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Mail, Phone, ArrowRight } from "lucide-react"
import { useAuth } from "@/auth/auth-context"
import { apiRequest, type AuthUser, type Division } from "@/lib/api"

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
    if (!code.trim()) { setError("Please enter the code."); return }
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
    <div className="min-h-screen flex items-center justify-center bg-neutral-bg p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-heading">Nexbaron Hub</h1>
          <p className="text-sm text-muted mt-2">Sign in to your {division} account</p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

        <div className="p-6 rounded-xl bg-neutral-surface border border-border space-y-4">
          {!otpSent ? (
            <>
              <label className="text-xs font-medium text-heading block">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full px-3 py-2.5 rounded-lg bg-neutral-bg border border-border text-heading text-sm placeholder:text-muted focus:outline-none focus:border-accent"
                onKeyDown={e => e.key === "Enter" && requestOtp()} />
              <button onClick={requestOtp} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-accent text-accent-fg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? "Sending..." : <><Mail className="h-4 w-4" /> Send verification code</>}
              </button>
            </>
          ) : (
            <>
              <label className="text-xs font-medium text-heading block">Verification code</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)}
                placeholder="000000" inputMode="numeric"
                className="w-full px-3 py-2.5 rounded-lg bg-neutral-bg border border-border text-heading text-sm text-center tracking-widest placeholder:text-muted focus:outline-none focus:border-accent"
                onKeyDown={e => e.key === "Enter" && verifyCode()} />
              {devCode && <p className="text-xs text-accent">Dev: {devCode}</p>}
              <button onClick={verifyCode} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-accent text-accent-fg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? "Verifying..." : <>Verify &amp; Sign In <ArrowRight className="h-4 w-4" /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
