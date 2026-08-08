import { useEffect, useState } from "react"
import { FileText, Loader2, IndianRupee, Calendar, CheckCircle2, Clock, Truck, AlertCircle, ChevronRight, Receipt, Download } from "lucide-react"
import { Link } from "react-router-dom"

import { apiRequest } from "@/lib/api"
import { useDivision } from "@/theme/theme-provider"

interface Order {
  _id: string
  plan?: string
  amount?: number
  amountPaid?: number
  status?: string
  service?: string
  invoiceNumber?: string
  paymentMethod?: string
  payments?: { method: string; amount: number; receivedAt: string }[]
  createdAt: string
}

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  paid: { label: "Paid", icon: CheckCircle2, color: "text-teal-500", bg: "bg-teal-500/10" },
  in_progress: { label: "In Progress", icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10" },
  delivered: { label: "Delivered", icon: Truck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  cancelled: { label: "Cancelled", icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
}

export default function Orders() {
  const division = useDivision()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)

  useEffect(() => {
    if (!division) return
    apiRequest<{ orders?: Order[] }>(`/${division}/payments/orders/mine`, {}, division)
      .then((d) => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [division])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-neutral-surface border border-border flex items-center justify-center mb-6">
          <Receipt className="w-10 h-10 text-muted/40" />
        </div>
        <h1 className="text-2xl font-bold text-heading mb-2">No orders yet</h1>
        <p className="text-sm text-muted mb-8 leading-relaxed max-w-sm mx-auto">
          Your purchases and invoices will appear here. Choose a plan and complete the payment to see your first order.
        </p>
        <Link
          to={`/${division}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-accent/20"
        >
          Go to Dashboard
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  const latest = orders[0]
  const config = STATUS_CONFIG[latest.status || "pending"] || STATUS_CONFIG.pending
  const StatusIcon = config.icon
  const totalSpent = orders.reduce((s, o) => s + (o.amount || 0), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Orders</h1>
          <p className="text-sm text-muted mt-0.5">
            {orders.length} order{orders.length !== 1 ? "s" : ""} · {MONEY.format(totalSpent)} total
          </p>
        </div>
      </div>

      {/* Latest order — featured card */}
      <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                <StatusIcon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted">Latest order</p>
                <p className="font-bold text-heading text-lg">{latest.plan || latest.service || "Order"}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 ${config.bg} ${config.color} text-[11px] px-3 py-1 rounded-full font-medium`}>
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/60">
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Amount</p>
              <p className="text-lg font-bold text-heading">{latest.amount ? MONEY.format(latest.amount) : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Paid</p>
              <p className="text-lg font-bold text-emerald-500">{latest.amountPaid ? MONEY.format(latest.amountPaid) : MONEY.format(latest.amount || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm font-medium text-heading flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted" />
                {new Date(latest.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Invoice</p>
              <p className="text-sm font-medium text-heading font-mono">
                {latest.invoiceNumber || "—"}
              </p>
            </div>
          </div>

          {latest.payments && latest.payments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Payment details</p>
              <div className="space-y-1.5">
                {latest.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted capitalize">{p.method}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted text-xs">
                        {new Date(p.receivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      <span className="font-medium text-heading">{MONEY.format(p.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order history */}
      {orders.length > 1 && (
        <div>
          <h2 className="text-sm font-semibold text-heading mb-3 px-1">Order History</h2>
          <div className="rounded-2xl bg-neutral-surface border border-border divide-y divide-border/60 overflow-hidden">
            {orders.slice(1).map((o) => {
              const cfg = STATUS_CONFIG[o.status || "pending"] || STATUS_CONFIG.pending
              const Icon = cfg.icon
              return (
                <div key={o._id} className="flex items-center justify-between px-5 py-4 hover:bg-neutral-bg transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{o.plan || o.service || "Order"}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-semibold text-heading">{MONEY.format(o.amount || 0)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted group-hover:text-heading transition-colors" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
