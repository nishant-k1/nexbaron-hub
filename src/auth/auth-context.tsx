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
    setUser(null)
    setInitialized(false)
    if (!div) { setInitialized(true); return }
    const token = getToken(div)
    if (!token) { if (gen === refreshGen.current) setInitialized(true); return }
    try {
      const data = await apiRequest<{ user: AuthUser }>(`/${div}/auth/me`, {}, div)
      if (gen !== refreshGen.current) return
      if (data.user.division !== div) { setToken(null, div); setUser(null) }
      else setUser(data.user)
    } catch { if (gen === refreshGen.current) { setToken(null, div); setUser(null) } }
    finally { if (gen === refreshGen.current) setInitialized(true) }
  }, [division])

  useEffect(() => { void refresh() }, [refresh])

  // Auto-login via ?token= in URL (from pricing page signup)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tokenParam = params.get("token")
    if (tokenParam && division) {
      const div = division
      // Verify the token by fetching /me
      setToken(tokenParam, div)
      apiRequest<{ user: AuthUser }>(`/${div}/auth/me`, {}, div)
        .then((data) => {
          if (data.user.division === div) {
            ++refreshGen.current
            setUser(data.user)
            setInitialized(true)
            // Clean URL
            navigate(`/${div}`, { replace: true })
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
    setToken(null, division)
    setUser(null)
    navigate(`/${division}`, { replace: true })
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
