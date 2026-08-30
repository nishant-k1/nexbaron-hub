import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { Toaster } from "sonner"
import { AuthProvider, useAuth } from "@/auth/auth-context"
import { ThemeProvider, DivisionProvider, useDivision } from "@/theme/theme-provider"
import { MetadataProvider } from "@/lib/metadata"
import type { Division } from "@/lib/api"
import AppLayout from "@/components/layout/AppLayout"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import Settings from "@/pages/Settings"
import Login from "@/pages/Login"
import HubDashboard from "@/pages/HubDashboard"
import Messages from "@/pages/Messages"
import Plans from "@/pages/Plans"
import Proposals from "@/pages/Proposals"
import Billing from "@/pages/Billing"
import BillingDetail from "@/pages/BillingDetail"
import Orders from "@/pages/Orders"
import OrderDetail from "@/pages/OrderDetail"

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

function DigitalLanding() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const qs = new URLSearchParams()
  if (params.get("plan")) qs.set("plan", params.get("plan")!)
  if (params.get("billing")) qs.set("billing", params.get("billing")!)
  return <Navigate to={`/digital/plans${qs.toString() ? `?${qs}` : ""}`} replace />
}

function HubRoutes() {
  const { initialized, user } = useAuth()
  const division = useDivision()
  const location = useLocation()

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
      <Route path="/:division" element={user ? <AppLayout /> : <Navigate to={`login${location.search}`} replace />}>
        <Route index element={division === "digital" ? <DigitalLanding /> : <ErrorBoundary name="HubDashboard"><HubDashboard /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary name="Settings"><Settings /></ErrorBoundary>} />
        <Route path="messages" element={<ErrorBoundary name="Messages"><Messages /></ErrorBoundary>} />
        {division === "digital" && (
          <>
            <Route path="plans" element={<ErrorBoundary name="Plans"><Plans /></ErrorBoundary>} />
            <Route path="packages" element={<Navigate to="plans" replace />} />
            <Route path="proposals/:proposalCode" element={<ErrorBoundary name="Proposals"><Proposals /></ErrorBoundary>} />
            <Route path="billing" element={<ErrorBoundary name="Billing"><Billing /></ErrorBoundary>} />
            <Route path="billing/:invoiceNumber" element={<ErrorBoundary name="BillingDetail"><BillingDetail /></ErrorBoundary>} />
            <Route path="orders" element={<ErrorBoundary name="Orders"><Orders /></ErrorBoundary>} />
            <Route path="orders/:id" element={<ErrorBoundary name="OrderDetail"><OrderDetail /></ErrorBoundary>} />
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
            <MetadataProvider>
              <HubRoutes />
              <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
                style: {
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--heading)",
                  borderRadius: "16px",
                },
              }}
            />
            </MetadataProvider>
          </DivisionWrapper>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
