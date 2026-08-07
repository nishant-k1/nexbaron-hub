import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  CreditCard,
  MessageSquare,
  FileText,
  MapPin,
  TrendingUp,
  Phone,
  Globe,
} from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import { useDivision } from "@/theme/theme-provider"
import { apiRequest } from "@/lib/api"

interface OrderItem {
  _id: string
  service: string
  amount: number
  status: "pending" | "paid" | "in_progress" | "delivered" | "cancelled"
  createdAt: string
}

const STEPS: Record<string, { label: string; icon: typeof CheckCircle2; description: string }[]> = {
  website: [
    { icon: CheckCircle2, label: "Design", description: "Mockup created and shared with you" },
    { icon: Circle, label: "Build", description: "Website pages are being built" },
    { icon: Circle, label: "Review", description: "You review and request changes" },
    { icon: Circle, label: "Launch", description: "Site goes live on your domain" },
  ],
  gbp: [
    { icon: CheckCircle2, label: "Setup", description: "Profile created and submitted to Google" },
    { icon: Circle, label: "Verification", description: "Google verifies your business (3-10 days)" },
    { icon: Circle, label: "Optimisation", description: "Photos, hours, services added" },
    { icon: Circle, label: "Ranking", description: "Showing up in local searches" },
  ],
  social: [
    { icon: CheckCircle2, label: "Setup", description: "Accounts created and branded" },
    { icon: Circle, label: "Content", description: "Posts, stories, and reels scheduled" },
    { icon: Circle, label: "Growth", description: "Followers and engagement growing" },
  ],
  default: [
    { icon: CheckCircle2, label: "Received", description: "We have your details" },
    { icon: Circle, label: "In Progress", description: "Working on your request" },
    { icon: Circle, label: "Review", description: "Ready for your feedback" },
    { icon: Circle, label: "Done", description: "All delivered" },
  ],
}

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

function getTimeline(order: OrderItem) {
  const s = (order.service || "").toLowerCase()
  if (s.includes("website") || s.includes("site")) return STEPS.website
  if (s.includes("google") || s.includes("gbp") || s.includes("profile")) return STEPS.gbp
  if (s.includes("social") || s.includes("instagram") || s.includes("facebook")) return STEPS.social
  return STEPS.default
}

function getServiceIcon(service: string) {
  const s = service.toLowerCase()
  if (s.includes("website") || s.includes("site")) return Globe
  if (s.includes("google") || s.includes("gbp") || s.includes("profile")) return MapPin
  if (s.includes("whatsapp") || s.includes("social")) return Phone
  if (s.includes("content") || s.includes("media")) return TrendingUp
  return FileText
}

export default function Dashboard() {
  const { user } = useAuth()
  const division = useDivision()

  const { data } = useQuery({
    queryKey: ["orders", division, user?.id],
    queryFn: () => apiFetch<{ orders: OrderItem[] }>(division!, "/orders/mine"),
    enabled: !!division,
  })
  const orders: OrderItem[] = data?.orders ?? []

  const activeOrders = orders.filter((o) => o.status !== "cancelled")
  const hasOrders = activeOrders.length > 0
  const latestOrder = activeOrders[0]
  const firstName = user?.name?.split(" ")[0] || ""

  // No orders yet — just signed up, no payment
  if (!hasOrders) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-heading">Welcome{firstName ? `, ${firstName}` : ""}!</h1>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            Your account is created and your plan is confirmed. Complete your payment to get started.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-neutral-surface border border-border space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <p className="text-sm text-muted">Next step</p>
              <p className="font-bold text-heading text-lg">Complete Payment</p>
            </div>
            <CreditCard className="w-6 h-6 text-accent" />
          </div>
          <button className="w-full py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" /> Pay Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <Link
          to={`/${division}/chat`}
          className="flex items-center gap-3 p-4 rounded-xl bg-neutral-surface border border-border hover:border-accent/30 transition-colors"
        >
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-heading text-sm">Have questions?</p>
            <p className="text-xs text-muted">Chat with us — we reply within minutes</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted" />
        </Link>
      </div>
    )
  }

  // Has active orders — show progress
  const timeline = latestOrder ? getTimeline(latestOrder) : STEPS.default
  const activeStep = 0 // TODO: derive from order status + days since creation
  const ServiceIcon = latestOrder ? getServiceIcon(latestOrder.service) : FileText

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-heading">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-muted mt-1">Here's how your work is progressing.</p>
      </div>

      {/* Active service */}
      {latestOrder && (
        <div className="p-6 rounded-2xl bg-neutral-surface border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <ServiceIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider">Current Service</p>
              <p className="font-bold text-heading">{latestOrder.service || "Your Plan"}</p>
            </div>
          </div>

          {/* Progress tracker */}
          <div className="space-y-0">
            {timeline.map((step, i) => {
              const isActive = i === activeStep
              const isDone = i < activeStep
              return (
                <div key={step.label} className="flex items-start gap-3 pb-4 last:pb-0 relative">
                  {/* Connector line */}
                  {i < timeline.length - 1 && (
                    <div className={`absolute left-[15px] top-8 w-0.5 h-full ${isDone ? "bg-accent" : "bg-border"}`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isDone ? "bg-accent text-white" : isActive ? "bg-accent/10 text-accent border-2 border-accent" : "bg-neutral-bg text-muted border-2 border-border"
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDone || isActive ? "text-heading" : "text-muted"}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All orders summary */}
      {orders.length > 1 && (
        <div className="p-4 rounded-xl bg-neutral-surface border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-heading">All Orders</h3>
            <Link to={`/${division}/orders`} className="text-xs text-accent flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 3).map((o) => (
              <div key={o._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-heading">{o.service || "Order"}</p>
                  <p className="text-xs text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-heading">{MONEY.format(o.amount)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    o.status === "delivered" ? "bg-emerald-500/15 text-emerald-600" :
                    o.status === "in_progress" ? "bg-blue-500/15 text-blue-600" :
                    o.status === "paid" ? "bg-teal-500/15 text-teal-600" :
                    "bg-amber-500/15 text-amber-600"
                  }`}>
                    {o.status === "in_progress" ? "In Progress" : o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to={`/${division}/orders`}
          className="p-4 rounded-xl bg-neutral-surface border border-border hover:border-accent/30 transition-colors group">
          <FileText className="w-5 h-5 text-muted mb-2" />
          <p className="text-sm font-medium text-heading">Orders</p>
          <p className="text-xs text-muted mt-0.5">View history & invoices</p>
        </Link>
        <Link to={`/${division}/progress`}
          className="p-4 rounded-xl bg-neutral-surface border border-border hover:border-accent/30 transition-colors group">
          <TrendingUp className="w-5 h-5 text-muted mb-2" />
          <p className="text-sm font-medium text-heading">Progress</p>
          <p className="text-xs text-muted mt-0.5">Real-time build tracking</p>
        </Link>
        <Link to={`/${division}/chat`}
          className="p-4 rounded-xl bg-neutral-surface border border-border hover:border-accent/30 transition-colors group">
          <MessageSquare className="w-5 h-5 text-muted mb-2" />
          <p className="text-sm font-medium text-heading">Chat</p>
          <p className="text-xs text-muted mt-0.5">Message your team</p>
        </Link>
      </div>
    </div>
  )
}
