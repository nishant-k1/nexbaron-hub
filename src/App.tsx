import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AuthProvider, useAuth } from "@/auth/auth-context"
import { ThemeProvider, DivisionProvider, useDivision } from "@/theme/theme-provider"
import type { Division } from "@/lib/api"
import AppLayout from "@/components/layout/AppLayout"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import Settings from "@/pages/Settings"
import Login from "@/pages/Login"
import HubDashboard from "@/pages/HubDashboard"
import Messages from "@/pages/Messages"
import Packages from "@/pages/Packages"
import Proposals from "@/pages/Proposals"
import Billing from "@/pages/Billing"

function divisionFromPath(pathname: string): Division | null {
  if (pathname.startsWith("/print")) return "print"
  if (pathname.startsWith("/digital")) return "digital"
  return null
}

function DivisionWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const division = divisionFromPath(location.pathname)
  return <DivisionProvider division={division}>{children}</DivisionProvider>
}

function HubRoutes() {
  const { initialized, user } = useAuth()
  const division = useDivision()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-bg">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/:division/login" element={<ErrorBoundary name="Login"><Login /></ErrorBoundary>} />
      <Route path="/:division" element={user ? <AppLayout /> : <Navigate to="login" replace />}>
        <Route index element={<ErrorBoundary name="HubDashboard"><HubDashboard /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary name="Settings"><Settings /></ErrorBoundary>} />
        <Route path="messages" element={<ErrorBoundary name="Messages"><Messages /></ErrorBoundary>} />
        {division === "digital" && (
          <>
            <Route path="packages" element={<ErrorBoundary name="Packages"><Packages /></ErrorBoundary>} />
            <Route path="proposals" element={<ErrorBoundary name="Proposals"><Proposals /></ErrorBoundary>} />
            <Route path="billing" element={<ErrorBoundary name="Billing"><Billing /></ErrorBoundary>} />
          </>
        )}
      </Route>
      <Route path="*" element={<Navigate to="/digital" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DivisionWrapper>
            <HubRoutes />
          </DivisionWrapper>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
