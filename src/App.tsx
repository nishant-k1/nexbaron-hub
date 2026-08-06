import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/auth/auth-context"
import { ThemeProvider, DivisionProvider } from "@/theme/theme-provider"
import AppLayout from "@/components/layout/AppLayout"
import Dashboard from "@/pages/Dashboard"
import Orders from "@/pages/Orders"
import Progress from "@/pages/Progress"
import Settings from "@/pages/Settings"
import Login from "@/pages/Login"

function HubRoutes() {
  const { initialized, user } = useAuth()

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-bg">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  }

  return (
    <Routes>
      <Route path="/:division/login" element={<Login />} />
      <Route path="/:division" element={user ? <AppLayout /> : <Navigate to="login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="progress" element={<Progress />} />
        <Route path="settings" element={<Settings />} />
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
          <DivisionProvider division={null}>
            <HubRoutes />
          </DivisionProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
