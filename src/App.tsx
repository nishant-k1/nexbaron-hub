import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AuthProvider, useAuth } from "@/auth/auth-context"
import { ThemeProvider, DivisionProvider } from "@/theme/theme-provider"
import type { Division } from "@/lib/api"
import AppLayout from "@/components/layout/AppLayout"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import Projects from "@/pages/Projects"
import ProjectDetail from "@/pages/ProjectDetail"
import Orders from "@/pages/Orders"
import Progress from "@/pages/Progress"
import Settings from "@/pages/Settings"
import Chat from "@/pages/Chat"
import Plan from "@/pages/Dashboard"
import Login from "@/pages/Login"

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
        <Route index element={<ErrorBoundary name="Projects"><Projects /></ErrorBoundary>} />
        <Route path="projects/:projectId" element={<ErrorBoundary name="ProjectDetail"><ProjectDetail /></ErrorBoundary>} />
        <Route path="orders" element={<ErrorBoundary name="Orders"><Orders /></ErrorBoundary>} />
        <Route path="progress" element={<ErrorBoundary name="Progress"><Progress /></ErrorBoundary>} />
        <Route path="plan" element={<ErrorBoundary name="Plan"><Plan /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary name="Settings"><Settings /></ErrorBoundary>} />
        <Route path="chat" element={<ErrorBoundary name="Chat"><Chat /></ErrorBoundary>} />
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
