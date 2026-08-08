import { Clock, Loader2, CheckCircle2, Circle, RefreshCw, Globe, MapPin, Phone, Star, PenTool, FileText, MessageSquare, Package, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useDivision } from "@/theme/theme-provider";

interface ServiceItem {
  label: string
  status: "pending" | "in_progress" | "done"
  type?: string
}

interface Order {
  _id: string; plan?: string; service?: string; status?: string
  amount?: number; amountPaid?: number; items?: ServiceItem[]; createdAt: string
}

const SERVICE_ICONS: Record<string, typeof Globe> = {
  website: Globe, site: Globe, page: Globe,
  google: MapPin, gbp: MapPin, profile: MapPin,
  whatsapp: Phone, booking: MessageSquare, message: MessageSquare,
  reviews: Star, review: Star, rating: Star,
  logo: PenTool, brand: PenTool, design: PenTool,
  seo: FileText, content: FileText, posts: FileText,
}
function getIcon(label: string) {
  const l = label.toLowerCase()
  for (const [k, icon] of Object.entries(SERVICE_ICONS)) if (l.includes(k)) return icon
  return FileText
}

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export default function Progress() {
  const division = useDivision()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const load = () => {
    if (!division) return
    setLoading(true)
    apiRequest<{ orders?: Order[] }>(`/${division}/payments/orders/mine`, {}, division)
      .then((d) => setOrder((d.orders || [])[0] || null))
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [division])

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
  if (!order) return (
    <div className="max-w-lg mx-auto py-16 text-center">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-neutral-surface border border-border flex items-center justify-center mb-6"><Clock className="w-10 h-10 text-muted/40" /></div>
      <h1 className="text-2xl font-bold text-heading mb-2">No active project</h1>
      <p className="text-sm text-muted">Complete your payment to see your project progress here.</p>
    </div>
  )

  const items = order.items?.length ? order.items : []
  const allItems: ServiceItem[] = [
    { label: "Package chosen", status: "done" },
    { label: "Payment completed", status: (order.status === "paid" || order.status === "in_progress" || order.status === "delivered") ? "done" : "pending" },
    ...items,
  ]
  const doneCount = allItems.filter((i) => i.status === "done").length
  const inProgressCount = allItems.filter((i) => i.status === "in_progress").length
  const pct = allItems.length > 0 ? Math.round((doneCount / allItems.length) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Progress</h1>
          <p className="text-sm text-muted mt-0.5">{order.plan || order.service || "Your Plan"}</p>
        </div>
        <button onClick={load} className="cursor-pointer p-2 rounded-lg hover:bg-neutral-surface text-muted hover:text-heading transition-colors"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Overall progress */}
      <div className="rounded-2xl bg-neutral-surface border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-heading">Overall Progress</span>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-accent" /> {doneCount} done</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> {inProgressCount} in progress</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-border" /> {items.length - doneCount - inProgressCount} pending</span>
          </div>
        </div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-neutral-bg">
          {allItems.map((item, i) => (
            <div key={i} className={`h-full transition-all duration-700 rounded-full ${
              item.status === "done" ? "bg-accent" : item.status === "in_progress" ? "bg-blue-500" : "bg-border"
            }`} style={{ width: `${100 / allItems.length}%` }} />
          ))}
        </div>
      </div>

      {/* Empty state */}
      {allItems.length === 0 && (
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 text-center">
          <Clock className="w-10 h-10 text-muted mx-auto mb-4" />
          <h3 className="font-semibold text-heading mb-1">Waiting for services</h3>
          <p className="text-sm text-muted">Your order is confirmed. Service tracking will begin shortly.</p>
        </div>
      )}

      {/* Service cards */}
      {allItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-heading mb-3 px-1">Your Services</h2>
          <div className="rounded-2xl bg-neutral-surface border border-border divide-y divide-border/60 overflow-hidden">
            {allItems.map((item, i) => {
              const Icon = item.label === "Package chosen" ? Package : item.label === "Payment completed" ? CreditCard : getIcon(item.label)
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    item.status === "done" ? "bg-accent/10 text-accent" :
                    item.status === "in_progress" ? "bg-blue-500/10 text-blue-500" : "bg-neutral-bg text-muted"
                  }`}><Icon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-heading truncate">{item.label}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {item.status === "done" ? "Completed" : item.status === "in_progress" ? "In progress" : "Pending"}
                    </p>
                  </div>
                  {item.status === "done" ? <CheckCircle2 className="w-5 h-5 text-accent shrink-0" /> :
                   item.status === "in_progress" ? <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" /> :
                   <Circle className="w-5 h-5 text-muted shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-2xl bg-neutral-surface border border-border p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Status</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              order.status === "paid" ? "bg-teal-500/10 text-teal-500" : order.status === "in_progress" ? "bg-blue-500/10 text-blue-500" :
              order.status === "delivered" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            }`}>{order.status === "in_progress" ? "In Progress" : order.status || "pending"}</span>
          </div>
          <div><p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Amount</p><p className="text-sm font-bold text-heading">{MONEY.format(order.amount || 0)}</p></div>
          <div><p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Services</p><p className="text-sm font-bold text-heading">{doneCount}/{allItems.length} done</p></div>
          <div><p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Since</p><p className="text-sm font-medium text-heading">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p></div>
        </div>
      </div>
    </div>
  )
}
