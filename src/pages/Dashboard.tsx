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
  Loader2,
} from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import { useDivision } from "@/theme/theme-provider"
import { apiRequest, type BillingCycleChoice } from "@/lib/api"

interface CatalogService {
  id: string
  label: string
  price: number
  type: "oneTime" | "monthly"
  annual?: number
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

const ICONS: Record<string, React.ElementType> = { launch: Rocket, growth: TrendingUp, scale: Building2 }

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

interface RawService {
  id: string
  label: string
  unitLabel?: string
  aggregate?: { selling?: { setup?: number; monthly?: number; annual?: number } }
}

// The API catalog exposes tiers via `aggregate.selling` (setup/monthly/annual), not a flat
// `price`/`type`. Normalise each service once so the rest of this page can read price + cycle safely.
function toService(s: RawService): CatalogService {
  const selling = s.aggregate?.selling ?? {}
  const monthly = selling.monthly ?? 0
  const setup = selling.setup ?? 0
  return {
    id: s.id,
    label: s.label,
    unitLabel: s.unitLabel,
    price: monthly > 0 ? monthly : setup,
    type: monthly > 0 ? "monthly" : "oneTime",
    annual: selling.annual,
  }
}

const annualOf = (s: CatalogService): number => (s.type === "monthly" ? (s.annual ?? s.price * 12) : 0)

export default function Dashboard() {
  const { user } = useAuth()
  const division = useDivision()
  const firstName = user?.name?.split(" ")[0] || ""

  const [plan, setPlan] = useState<CatalogPlan | null>(null)
  const [planId, setPlanId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [addOns, setAddOns] = useState<Record<string, number>>({})
  const [paying, setPaying] = useState(false)
  const [saving, setSavingPlan] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [billingCycle, setBillingCycle] = useState<BillingCycleChoice>(() => {
    if (typeof window === "undefined") return "monthly"
    const fromUrl = new URLSearchParams(window.location.search).get("billing")
    if (fromUrl === "annual" || fromUrl === "monthly") return fromUrl
    const fromConfig = user?.planConfig?.billingCycle
    if (fromConfig === "annual" || fromConfig === "monthly") return fromConfig
    return localStorage.getItem("nexbaron-billing") === "annual" ? "annual" : "monthly"
  })

  const switchBilling = (cycle: BillingCycleChoice) => {
    setBillingCycle(cycle)
    if (typeof window !== "undefined") localStorage.setItem("nexbaron-billing", cycle)
  }

  useEffect(() => {
    if (!division) return
    apiRequest<{ plans: (Omit<CatalogPlan, "services" | "addOns"> & { services: RawService[]; addOns: RawService[] })[] }>("/" + division + "/catalog", {}, division)
      .then((data) => {
        const config = user?.planConfig
        const fromUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("plan") : null
        const planIdFromConfig = config?.planId || fromUrl || localStorage.getItem("nexbaron-plan-id") || "launch"
        const found = data.plans.find((p) => p.id === planIdFromConfig) || data.plans[0]
        if (found) {
          setPlanId(planIdFromConfig)
          setPlan({ ...found, services: found.services.map(toService), addOns: found.addOns.map(toService) })
          if (typeof window !== "undefined") localStorage.setItem("nexbaron-plan-id", planIdFromConfig)
        }
        const services = found?.services ?? []
        if (config?.removedServices) {
          const e = new Set(services.map((s) => s.id))
          config.removedServices.forEach((id: string) => e.delete(id))
          setEnabled(e)
        } else {
          setEnabled(new Set(services.map((s) => s.id)))
        }
        if (config?.addOns) setAddOns(config.addOns)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [division, user?.planConfig])

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
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const includedOneTime = plan.services.filter((s) => enabled.has(s.id) && s.type === "oneTime").reduce((s, x) => s + x.price, 0)
  const includedMonthly = plan.services.filter((s) => enabled.has(s.id) && s.type === "monthly").reduce((s, x) => s + x.price, 0)
  const includedAnnual = plan.services.filter((s) => enabled.has(s.id) && s.type === "monthly").reduce((s, x) => s + annualOf(x), 0)
  const addOnOneTime = plan.addOns.filter((a) => (addOns[a.id] || 0) > 0 && a.type === "oneTime").reduce((s, a) => s + a.price * (addOns[a.id] || 0), 0)
  const addOnMonthly = plan.addOns.filter((a) => (addOns[a.id] || 0) > 0 && a.type === "monthly").reduce((s, a) => s + a.price * (addOns[a.id] || 0), 0)
  const addOnAnnual = plan.addOns.filter((a) => (addOns[a.id] || 0) > 0 && a.type === "monthly").reduce((s, a) => s + annualOf(a) * (addOns[a.id] || 0), 0)

  const totalOneTime = includedOneTime + addOnOneTime
  const totalMonthly = includedMonthly + addOnMonthly
  const totalAnnual = includedAnnual + addOnAnnual
  const recurringTotal = billingCycle === "annual" ? totalAnnual : totalMonthly
  const annualSavings = billingCycle === "annual" ? totalMonthly * 12 - totalAnnual : 0
  const removedCount = plan.services.length - enabled.size
  const addOnCount = Object.keys(addOns).length
  const hasChanges = removedCount > 0 || addOnCount > 0
  const Icon = ICONS[planId] || Rocket

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-1">Welcome{firstName ? `, ${firstName}` : ""}</p>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 text-accent">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-heading">Your {plan.name} Plan</h1>
            <p className="text-sm text-muted">{plan.tagline}</p>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted bg-neutral-surface border border-border/50 px-3 py-1.5 rounded-full">
          <Sparkles className="w-3 h-3 text-accent" />
          {plan.timeline}
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Services (3 columns on lg) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Included */}
          <div className="rounded-2xl bg-neutral-surface overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted" />
                <h2 className="text-sm font-semibold text-heading">What's included</h2>
              </div>
              {removedCount > 0 && (
                <span className="text-[10px] text-muted bg-neutral-bg px-2 py-0.5 rounded-full">
                  {removedCount} removed
                </span>
              )}
            </div>
            <div className="divide-y divide-border/40">
              {plan.services.map((s) => {
                const on = enabled.has(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className="cursor-pointer w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-neutral-bg transition-colors group"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      on ? `border-accent bg-accent` : "border-muted/40"
                    }`}>
                      {on && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-sm flex-1 ${on ? "text-heading" : "text-muted/40 line-through"}`}>
                      {s.label}
                    </span>
                    <span className={`text-xs ${on ? "text-muted" : "text-muted/30 line-through"}`}>
                      {s.type === "monthly"
                        ? billingCycle === "annual"
                          ? `${MONEY.format(annualOf(s))}/yr`
                          : `${MONEY.format(s.price)}/mo`
                        : MONEY.format(s.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Add-ons */}
          <div className="rounded-2xl bg-neutral-surface overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-muted" />
                <h2 className="text-sm font-semibold text-heading">Add extra services</h2>
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {plan.addOns.map((a) => {
                const count = addOns[a.id] || 0
                return (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm text-heading truncate">{a.label}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {MONEY.format(a.price)}{a.unitLabel ? ` ${a.unitLabel}` : ""}{a.type === "monthly"
                          ? billingCycle === "annual"
                            ? "/yr"
                            : "/mo"
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => count > 0 && setAddOn(a.id, count - 1)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          count > 0 ? "border-muted text-muted hover:border-accent hover:text-accent" : "opacity-0 pointer-events-none"
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`text-sm font-medium w-5 text-center ${count > 0 ? "text-heading" : "text-muted/30"}`}>
                        {count || "—"}
                      </span>
                      <button
                        onClick={() => setAddOn(a.id, count + 1)}
                        className="cursor-pointer w-6 h-6 rounded-lg border border-accent/20 text-accent/60 hover:border-accent hover:text-accent hover:bg-accent/5 flex items-center justify-center transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right — Price + Actions (2 columns on lg) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Price card */}
          <div className="rounded-2xl bg-neutral-surface p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-neutral-bg border border-border/60">
                {(["monthly", "annual"] as const).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => switchBilling(cycle)}
                    className={`cursor-pointer px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      billingCycle === cycle ? "bg-accent text-accent-fg" : "text-muted hover:text-heading"
                    }`}
                  >
                    {cycle === "monthly" ? "Monthly" : "Annual"}
                  </button>
                ))}
              </div>
              {billingCycle === "annual" && (
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {MONEY.format(annualSavings)}/yr off
                </span>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-muted">One-time</span>
                {removedCount > 0 && (
                  <span className="text-[10px] text-emerald-400 font-medium">-{MONEY.format(plan.oneTime - includedOneTime)}</span>
                )}
              </div>
              <p className="text-3xl font-extrabold text-heading tracking-tight">{MONEY.format(totalOneTime)}</p>
            </div>

            <div className="mb-5 pb-5 border-b border-border/60">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xs text-muted">+</span>
                <span className="text-xl font-bold text-heading">{MONEY.format(recurringTotal)}</span>
                <span className="text-xs text-muted">{billingCycle === "annual" ? "/year" : "/month"}</span>
              </div>
              <p className={`text-[10px] ${billingCycle === "annual" ? "text-emerald-400 font-medium" : "text-muted"}`}>
                {billingCycle === "annual"
                  ? "One annual payment — 2 months free. Cancel anytime."
                  : "Cancel anytime. Site is yours forever."}
              </p>
            </div>

            <button onClick={() => {
              if (!division || !plan) return
              setPaying(true)
              const selected = plan.services.filter((s) => enabled.has(s.id)).map((s) => s.id)
              const addOnIds = Object.entries(addOns).filter(([, c]) => (c || 0) > 0).map(([id]) => id)
              const body = JSON.stringify({
                planId,
                billingCycle,
                selections: {
                  planId,
                  plans: {
                    [planId]: {
                      selected,
                      addOns: addOnIds,
                      addOnCounts: addOns,
                      inheritedOn: true,
                    },
                  },
                },
              })
              apiRequest<{ razorpayOrderId: string; razorpayKeyId: string; amount: number; devMode?: boolean }>(
                '/' + division + '/payments/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }, division)
                .then(async order => {
                  if (order.devMode) {
                    // Dev mode: skip Razorpay, simulate success
                    await apiRequest('/' + division + '/payments/verify', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: 'dev_payment', razorpay_signature: 'dev_signature' }),
                    }, division)
                    window.location.href = '/' + division + '/' + 'orders'
                    return
                  }
                  new (window as any).Razorpay({
                    key: order.razorpayKeyId, amount: order.amount * 100, currency: 'INR',
                    name: 'Nexbaron ' + (division === 'digital' ? 'Digital' : 'Print'),
                    description: planId + ' Plan', order_id: order.razorpayOrderId,
                    handler: async (r: any) => {
                      await apiRequest('/' + division + '/payments/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) }, division)
                      window.location.href = '/' + division + '/' + 'orders'
                    },
                    prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
                    theme: { color: division === 'digital' ? '#14b8a6' : '#f59e0b' },
                  }).open()
                })
                .finally(() => setPaying(false))
            }} disabled={paying} className="cursor-pointer w-full py-3 bg-accent hover:opacity-90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50">
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {paying ? "Opening..." : "Pay & Start"}
              {!paying && <ArrowRight className="w-4 h-4" />}
            </button>

            <p className="text-center text-[10px] text-muted mt-3">
              Secure payment. No hidden fees.
            </p>
          </div>

          {/* Save & Chat */}
          <div className="space-y-3">
            {hasChanges && (
              <button
                onClick={async () => {
                  setSavingPlan(true)
                  setSaveError(null)
                  const removed = plan.services.filter((s) => !enabled.has(s.id)).map((s) => s.id)
                  try {
                    await apiRequest("/" + division! + "/auth/save-plan", {
                      method: "PATCH", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ planId, removedServices: removed, addOns, billingCycle }),
                    }, division!)
                  } catch (err) {
                    setSaveError(err instanceof Error ? err.message : "Could not save changes")
                  } finally { setSavingPlan(false) }
                }}
                disabled={saving}
                className="cursor-pointer w-full py-3 bg-accent/10 border border-accent/30 text-accent font-bold rounded-xl hover:bg-accent/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          {saveError && <p className="text-xs text-red-400 mt-2 text-center">{saveError}</p>}
          <Link
            to={`/${division}/chat`}
            className="flex items-center gap-3 p-4 rounded-2xl bg-neutral-surface hover:border-accent/20 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-heading">Questions?</p>
              <p className="text-xs text-muted">Chat with our team</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
          </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
