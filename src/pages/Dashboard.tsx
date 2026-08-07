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
  ArrowRight,
  MessageSquare,
  Sparkles,
  Package,
  ShoppingBag,
} from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import { useDivision } from "@/theme/theme-provider"
import { apiRequest } from "@/lib/api"

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
  { id: "seo", label: "SEO blog posts", price: 999, type: "monthly", unitLabel: "per post" },
  { id: "social", label: "Social media posts", price: 799, type: "monthly", unitLabel: "per post" },
  { id: "ads", label: "Google Ads management", price: 4999, type: "monthly" },
]

const ICONS: Record<string, React.ElementType> = { launch: Rocket, growth: TrendingUp, scale: Building2 }
const ACCENTS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  launch: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", gradient: "from-violet-500/5 to-violet-600/5" },
  growth: { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30", gradient: "from-accent/5 to-accent/10" },
  scale: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", gradient: "from-amber-500/5 to-amber-600/5" },
}

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export default function Dashboard() {
  const { user } = useAuth()
  const division = useDivision()
  const firstName = user?.name?.split(" ")[0] || ""

  const [plan, setPlan] = useState<CatalogPlan | null>(null)
  const [planId, setPlanId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [addOns, setAddOns] = useState<Record<string, number>>({})

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

  if (!plan || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const includedOneTime = plan.services.filter((s) => enabled.has(s.id) && s.type === "oneTime").reduce((s, x) => s + x.price, 0)
  const includedMonthly = plan.services.filter((s) => enabled.has(s.id) && s.type === "monthly").reduce((s, x) => s + x.price, 0)
  const addOnOneTime = ADDONS.filter((a) => (addOns[a.id] || 0) > 0 && a.type === "oneTime").reduce((s, a) => s + a.price * (addOns[a.id] || 0), 0)
  const addOnMonthly = ADDONS.filter((a) => (addOns[a.id] || 0) > 0 && a.type === "monthly").reduce((s, a) => s + a.price * (addOns[a.id] || 0), 0)

  const totalOneTime = includedOneTime + addOnOneTime
  const totalMonthly = includedMonthly + addOnMonthly
  const removedCount = plan.services.length - enabled.size
  const addOnCount = Object.keys(addOns).length

  const Icon = ICONS[planId] || Rocket
  const accent = ACCENTS[planId] || ACCENTS.growth

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-8">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-2xl bg-neutral-surface border border-border p-6`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className={`p-3 rounded-2xl bg-accent/10 border border-accent/20 text-accent`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted mb-0.5">Welcome{firstName ? `, ${firstName}` : ""}</p>
            <h1 className="text-xl font-bold text-heading">Your {plan.name} Plan</h1>
            <p className="text-sm text-muted mt-1">{plan.tagline}</p>
          </div>
        </div>
        <div className="relative mt-4 inline-flex items-center gap-1.5 text-xs text-muted bg-neutral-bg px-3 py-1.5 rounded-full">
          <Sparkles className="w-3 h-3 text-accent" />
          {plan.timeline}
        </div>
      </div>

      {/* Price breakdowns */}
      <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
        <div className="p-5">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-muted">One-time payment</span>
            {removedCount > 0 && (
              <span className="text-[10px] text-emerald-400">-{MONEY.format(plan.oneTime - includedOneTime)} off</span>
            )}
          </div>
          <p className="text-4xl font-extrabold text-heading tracking-tight">{MONEY.format(totalOneTime)}</p>
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-muted">+</span>
            <span className="text-2xl font-bold text-heading">{MONEY.format(totalMonthly)}</span>
            <span className="text-xs text-muted">/month</span>
          </div>
          <p className="text-[10px] text-muted mt-0.5">Cancel anytime. Your website is yours forever.</p>
        </div>
      </div>

      {/* Included services */}
      <div>
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted" />
            <h3 className="text-sm font-semibold text-heading">What's included</h3>
          </div>
          {removedCount > 0 && (
            <span className="text-[10px] text-muted bg-neutral-bg px-2 py-0.5 rounded-full">
              {removedCount} removed
            </span>
          )}
        </div>
        <div className="rounded-2xl bg-neutral-surface border border-border divide-y divide-border/60 overflow-hidden">
          {plan.services.map((s) => {
            const on = enabled.has(s.id)
            return (
              <button
                key={s.id}
                onClick={() => toggleService(s.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-neutral-bg transition-colors group"
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  on
                    ? `${accent.bg} ${accent.border}`
                    : "border-muted/30 opacity-40"
                }`}>
                  {on && <Check className="w-3 h-3 text-accent" />}
                </div>
                <span className={`text-sm flex-1 transition-colors ${on ? "text-heading" : "text-muted line-through opacity-50"}`}>
                  {s.label}
                </span>
                <span className={`text-xs transition-colors ${on ? "text-muted" : "text-muted/30 line-through"}`}>
                  {MONEY.format(s.price)}{s.type === "monthly" ? "/mo" : ""}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-2">
          <ShoppingBag className="w-4 h-4 text-muted" />
          <h3 className="text-sm font-semibold text-heading">Add-ons</h3>
          {addOnCount > 0 && (
            <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full ml-auto">
              +{MONEY.format(addOnOneTime + addOnMonthly)}
            </span>
          )}
        </div>
        <div className="rounded-2xl bg-neutral-surface border border-border divide-y divide-border/60 overflow-hidden">
          {ADDONS.map((a) => {
            const count = addOns[a.id] || 0
            return (
              <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex-1">
                  <p className="text-sm text-heading">{a.label}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {MONEY.format(a.price)}{a.unitLabel ? ` ${a.unitLabel}` : ""}{a.type === "monthly" ? "/mo" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddOn(a.id, count - 1)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                      count > 0 ? "border-muted text-muted hover:border-accent hover:text-accent" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className={`text-sm font-medium min-w-[20px] text-center transition-colors ${count > 0 ? "text-heading" : "text-muted/30"}`}>
                    {count || "—"}
                  </span>
                  <button
                    onClick={() => setAddOn(a.id, count + 1)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                      count > 0
                        ? "border-muted text-muted hover:border-accent hover:text-accent"
                        : "border-accent/20 text-accent/60 hover:border-accent hover:text-accent hover:bg-accent/5"
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

      {/* Chat link */}
      <Link
        to={`/${division}/chat`}
        className="flex items-center gap-3 p-4 rounded-2xl bg-neutral-surface border border-border hover:border-accent/20 transition-colors group"
      >
        <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-heading">Not sure about something?</p>
          <p className="text-xs text-muted">Chat with us — we'll help you decide</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
      </Link>

      {/* Sticky payment bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-bg/95 backdrop-blur-xl border-t border-border p-4 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-heading">{MONEY.format(totalOneTime)}</span>
              <span className="text-xs text-muted">+ {MONEY.format(totalMonthly)}/mo</span>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-accent/20">
            <CreditCard className="w-4 h-4" />
            Pay & Start
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
