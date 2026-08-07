import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Check,
  Plus,
  Minus,
  CreditCard,
  Rocket,
  TrendingUp,
  Building2,
  X,
  ArrowRight,
} from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import { useDivision } from "@/theme/theme-provider"
import { apiRequest } from "@/lib/api"

// Local plan data — mirrors the backend catalog
interface CatalogService {
  id: string
  label: string
  price: number
  type: "oneTime" | "monthly"
  unitLabel?: string
}

interface CatalogPlan {
  id: string
  name: string
  oneTime: number
  monthly: number
  monthlyName: string
  tagline: string
  timeline: string
  services: CatalogService[]
  addOns: CatalogService[]
}

const ADDONS: CatalogService[] = [
  { id: "extra-pages", label: "Extra pages", price: 1499, type: "oneTime", unitLabel: "per page" },
  { id: "photos", label: "Additional photos", price: 699, type: "oneTime" },
  { id: "logo", label: "Logo design", price: 2999, type: "oneTime" },
  { id: "seo", label: "SEO optimised blog posts", price: 999, type: "monthly", unitLabel: "per post" },
  { id: "social", label: "Social media posts", price: 799, type: "monthly", unitLabel: "per post" },
  { id: "ads", label: "Google Ads setup & management", price: 4999, type: "monthly" },
]

const ICONS: Record<string, React.ElementType> = { launch: Rocket, growth: TrendingUp, scale: Building2 }

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export default function Dashboard() {
  const { user } = useAuth()
  const division = useDivision()
  const firstName = user?.name?.split(" ")[0] || ""

  const [plan, setPlan] = useState<CatalogPlan | null>(null)
  const [planId, setPlanId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Services the customer wants (all enabled by default)
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [addOns, setAddOns] = useState<Record<string, number>>({})

  // Fetch catalog
  useEffect(() => {
    if (!division) return
    apiRequest<{ plans: CatalogPlan[] }>("/" + division + "/catalog", {}, division)
      .then((data) => {
        const stored = localStorage.getItem("nexbaron-plan-id") || "launch"
        const found = data.plans.find((p) => p.id === stored) || data.plans[0]
        setPlanId(stored)
        setPlan(found)
        setEnabled(new Set(found.services.map((s) => s.id)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [division])

  const toggleService = (id: string) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setAddOn = (id: string, count: number) => {
    setAddOns((prev) => {
      const next = { ...prev }
      if (count <= 0) delete next[id]
      else next[id] = count
      return next
    })
  }

  // Price calculations
  if (!plan || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const includedOneTime = plan.services.reduce((sum, s) => enabled.has(s.id) ? sum + s.price : sum, 0)
  const includedMonthly = plan.services.reduce((sum, s) => enabled.has(s.id) && s.type === "monthly" ? sum + s.price : sum, 0)
  const addOnOneTime = ADDONS.reduce((sum, a) => (addOns[a.id] || 0) > 0 ? sum + a.price * (addOns[a.id] || 0) : sum, 0)
  const addOnMonthly = ADDONS.reduce((sum, a) => (addOns[a.id] || 0) > 0 && a.type === "monthly" ? sum + a.price * (addOns[a.id] || 0) : sum, 0)

  const totalOneTime = includedOneTime + addOnOneTime
  const totalMonthly = includedMonthly + addOnMonthly
  const Icon = ICONS[planId] || Rocket
  const hasChanges = enabled.size !== plan.services.length || Object.keys(addOns).length > 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-heading">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-muted mt-1">
          Your plan is confirmed. Review, customise, and pay to get started.
        </p>
      </div>

      {/* Plan card */}
      <div className="p-6 rounded-2xl bg-neutral-surface border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-heading">{plan.name}</h2>
            <p className="text-xs text-muted">{plan.timeline}</p>
          </div>
        </div>

        <p className="text-sm text-muted leading-relaxed mb-4">{plan.tagline}</p>

        {/* Price display */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-extrabold text-heading">{MONEY.format(totalOneTime)}</span>
          <span className="text-xs text-muted">one-time</span>
          <span className="text-heading">+</span>
          <span className="text-lg font-bold text-heading">{MONEY.format(totalMonthly)}</span>
          <span className="text-xs text-muted">/month</span>
        </div>

        {/* Payment button */}
        <button className="w-full py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <CreditCard className="w-4 h-4" />
          Pay {MONEY.format(totalOneTime)} & Subscribe
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Included services — toggle to add/remove */}
      <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-heading">What's included</h3>
          <span className="text-xs text-muted">Tap to add or remove</span>
        </div>
        <div className="divide-y divide-border">
          {plan.services.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleService(s.id)}
              className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-neutral-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  enabled.has(s.id) ? "bg-accent border-accent" : "border-muted"
                }`}>
                  {enabled.has(s.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-heading">{s.label}</span>
              </div>
              <span className="text-sm text-muted">{MONEY.format(s.price)}</span>
            </button>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-border bg-neutral-bg/50">
          <p className="text-xs text-muted">
            Included total: {MONEY.format(includedOneTime)} one-time + {MONEY.format(includedMonthly)}/month
          </p>
        </div>
      </div>

      {/* Add-ons */}
      <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-heading">Add-ons</h3>
          <p className="text-xs text-muted mt-0.5">Extra services you can add to your plan</p>
        </div>
        <div className="divide-y divide-border">
          {ADDONS.map((a) => {
            const count = addOns[a.id] || 0
            return (
              <div key={a.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="flex-1">
                  <p className="text-sm text-heading">{a.label}</p>
                  <p className="text-xs text-muted">
                    {MONEY.format(a.price)}{a.unitLabel ? ` ${a.unitLabel}` : ""} {a.type === "monthly" ? "/month" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && (
                    <>
                      <button
                        onClick={() => setAddOn(a.id, count - 1)}
                        className="w-7 h-7 rounded-lg border border-muted flex items-center justify-center text-muted hover:border-accent hover:text-accent transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium text-heading w-5 text-center">{count}</span>
                    </>
                  )}
                  <button
                    onClick={() => setAddOn(a.id, count + 1)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                      count > 0 ? "border-muted text-muted hover:border-accent hover:text-accent" : "border-accent/30 text-accent hover:bg-accent/10"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex gap-3">
        <Link
          to={`/${division}/chat`}
          className="flex-1 p-4 rounded-xl bg-neutral-surface border border-border hover:border-accent/30 transition-colors text-center"
        >
          <p className="text-sm font-medium text-heading">Need changes?</p>
          <p className="text-xs text-muted mt-0.5">Chat with us</p>
        </Link>
        {hasChanges && (
          <button className="flex-1 p-4 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/20 transition-colors text-center">
            <p className="text-sm font-medium text-accent">Save changes</p>
            <p className="text-xs text-muted mt-0.5">Your updated plan</p>
          </button>
        )}
      </div>
    </div>
  )
}
