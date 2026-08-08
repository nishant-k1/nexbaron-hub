import { Clock, Loader2, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useDivision } from "@/theme/theme-provider";

interface ServiceItem { label: string; status: "pending" | "in_progress" | "done"; type?: string }

interface Order { _id: string; plan?: string; service?: string; status?: string; amount?: number; amountPaid?: number; items?: ServiceItem[]; createdAt: string }

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

      {/* Timeline */}
      <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider">{order.plan || order.service || "Your Plan"}</p>
              <p className="text-2xl font-extrabold text-heading mt-1">{pct}%</p>
            </div>
            <div className="w-16 h-16 rounded-full border-[5px] border-accent/20 flex items-center justify-center">
              <span className="text-lg font-extrabold text-accent">{doneCount}<span className="text-sm text-muted font-normal">/{allItems.length}</span></span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-neutral-bg rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="border-t border-border">
          {allItems.map((item, i) => (
            <div key={i} className={`flex items-center gap-4 px-6 py-4 relative ${item.status === "done" ? "" : "opacity-30"}`}>
              {i < allItems.length - 1 && (
                <div className={`absolute left-[29px] top-10 bottom-0 w-0.5 ${item.status === "done" && allItems[i + 1]?.status === "done" ? "bg-accent" : "bg-border"}`} />
              )}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                item.status === "done" ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-neutral-bg border-2 border-muted text-muted"
              }`}>
                {item.status === "done" ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm ${item.status === "done" ? "text-heading font-semibold" : "text-muted"}`}>{item.label}</p>
                {i === doneCount && doneCount < allItems.length && (
                  <p className="text-[10px] text-accent mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> In progress</p>
                )}
              </div>
              {item.status === "done" && <span className="text-[10px] text-emerald-400 font-medium">Done</span>}
            </div>
          ))}
        </div>
      </div>

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
