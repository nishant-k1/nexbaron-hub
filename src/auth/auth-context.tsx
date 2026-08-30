import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { apiRequest, getToken, setToken, type AuthUser, type Division } from "@/lib/api"

interface AuthContextValue {
  user: AuthUser | null
  division: Division | null
  initialized: boolean
  signIn: (token: string, user: AuthUser) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function divisionFromPath(pathname: string): Division | null {
  if (pathname.startsWith("/print")) return "print"
  if (pathname.startsWith("/digital")) return "digital"
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const division = divisionFromPath(location.pathname)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initialized, setInitialized] = useState(false)
  const refreshGen = useRef(0)

  const refresh = useCallback(async () => {
    const gen = ++refreshGen.current
    const div = division
    // Do not blank user while ?token= is being verified - avoids flash + preserves plan intent
    const hasTokenParam = new URLSearchParams(location.search).has("token")
    if (!hasTokenParam) setUser(null)
    setInitialized(false)
    if (!div) { setInitialized(true); return }
    try {
      const data = await apiRequest<{ user: AuthUser }>(`/${div}/auth/me`, {}, div)
      if (gen !== refreshGen.current) return
      if (data.user.division !== div) { setToken(null, div); localStorage.removeItem(`nexbaron-user-${div}`); setUser(null) }
      else { setUser(data.user); localStorage.setItem(`nexbaron-user-${div}`, JSON.stringify(data.user)) }
    } catch (err) {
      if (gen === refreshGen.current) {
        // On auth failure (401) the token is invalid — clear the session.
        // Only fall back to the cached user for a genuine network error.
        const isAuthError = err instanceof Error && 'status' in err && (err as { status?: number }).status === 401
        if (isAuthError) {
          setToken(null, div)
          localStorage.removeItem(`nexbaron-user-${div}`)
          setUser(null)
        } else {
          const cached = localStorage.getItem(`nexbaron-user-${div}`)
          if (cached) { try { setUser(JSON.parse(cached)) } catch { setUser(null) } }
          else setUser(null)
        }
        setInitialized(true)
      }
    }
    finally { if (gen === refreshGen.current) setInitialized(true) }
  }, [division])

  useEffect(() => { void refresh() }, [refresh])

  // Auto-login via ?token= in URL (from pricing page signup)
  // Preserves ?plan=&billing=&proposal= intent so Plans/Proposals can auto-open the right view.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tokenParam = params.get("token")
    if (tokenParam && division) {
      const div = division
      const plan = params.get("plan")
      const billing = params.get("billing")
      const proposal = params.get("proposal")
      // Verify the token by fetching /me
      setToken(tokenParam, div)
      apiRequest<{ user: AuthUser }>(`/${div}/auth/me`, {}, div)
        .then((data) => {
          if (data.user.division === div) {
            ++refreshGen.current
            setUser(data.user)
            setInitialized(true)
            // Clean token from URL but keep plan/billing/proposal intent
            const qs = new URLSearchParams()
            if (plan) qs.set("plan", plan)
            if (billing) qs.set("billing", billing)
            if (proposal) qs.set("proposal", proposal)
            const target = qs.toString() ? `/${div}?${qs.toString()}` : `/${div}`
            navigate(target, { replace: true })
          } else {
            setToken(null, div)
          }
        })
        .catch(() => {
          setToken(null, div)
        })
    }
  }, []) // only on mount

  const signIn = useCallback((token: string, u: AuthUser) => {
    ++refreshGen.current
    setToken(token, u.division)
    setUser(u)
    setInitialized(true)
  }, [])

  const signOut = useCallback(() => {
    if (!division) return
    const div = division
    setToken(null, div)
    setUser(null)
    // Clear server cookie (best-effort) — with credentials include
    apiRequest<{ success: boolean }>(`/${div}/auth/sign-out`, { method: "POST" }, div, { silent: true }).catch(() => {})
    navigate(`/${div}`, { replace: true })
  }, [division, navigate])

  const value = useMemo(() => ({
    user: division && user?.division === division ? user : null,
    division, initialized, signIn, signOut,
  }), [user, division, initialized, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
