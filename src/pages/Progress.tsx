import { Clock, Loader2, CheckCircle2, Circle, ArrowRight, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useDivision } from "@/theme/theme-provider";

interface Milestone { label: string; done: boolean }
interface Order {
  _id: string
  plan?: string
  service?: string
  status?: string
  amount?: number
  amountPaid?: number
  milestones?: Milestone[]
  createdAt: string
}

const WEBSITE_TIMELINE = [
  { label: "Order received", key: "received" },
  { label: "Payment confirmed", key: "paid" },
  { label: "Building your website", key: "build" },
  { label: "Review & feedback", key: "review" },
  { label: "Final tweaks", key: "final" },
  { label: "Your site is live!", key: "delivered" },
]

const GBP_TIMELINE = [
  { label: "Order received", key: "received" },
  { label: "Payment confirmed", key: "paid" },
  { label: "Profile created & submitted", key: "build" },
  { label: "Google verification", key: "review" },
  { label: "Optimised & ranking", key: "delivered" },
]

const DEFAULT_TIMELINE = [
  { label: "Order received", key: "received" },
  { label: "Payment confirmed", key: "paid" },
  { label: "Working on it", key: "build" },
  { label: "Almost done", key: "review" },
  { label: "Complete", key: "delivered" },
]

function getTimeline(order: Order) {
  const s = (order.plan || order.service || "").toLowerCase()
  if (s.includes("web") || s.includes("launch") || s.includes("growth") || s.includes("scale")) return WEBSITE_TIMELINE
  if (s.includes("gbp") || s.includes("google") || s.includes("profile")) return GBP_TIMELINE
  return DEFAULT_TIMELINE
}

function getMilestones(order: Order, timeline: { label: string; key: string }[]): Milestone[] {
  const status = order.status || "pending"
  const statusOrder = ["received", "paid", "build", "review", "final", "delivered"]
  const currentIdx = statusOrder.indexOf(status)
  const resolvedIdx = currentIdx >= 0 ? currentIdx : (status === "in_progress" ? 2 : 1)

  return timeline.map((t, i) => ({
    label: t.label,
    done: status === "delivered" ? true : i <= resolvedIdx,
  }))
}

export default function Progress() {
  const division = useDivision();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!division) return;
    setLoading(true);
    apiRequest<{ orders?: Order[] }>(`/${division}/payments/orders/mine`, {}, division)
      .then((d) => setOrder((d.orders || [])[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load() }, [division]);

  const timeline = getTimeline(order || {} as Order)
  const milestones = getMilestones(order || {} as Order, timeline)
  const done = milestones.filter((m) => m.done).length
  const pct = Math.round((done / milestones.length) * 100)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Progress</h1>
          <p className="text-sm text-muted mt-0.5">Real-time project tracking</p>
        </div>
        {order && (
          <button onClick={load} className="cursor-pointer p-2 rounded-lg hover:bg-neutral-surface text-muted hover:text-heading transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
      ) : !order ? (
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 text-center">
          <Clock className="w-10 h-10 text-muted mx-auto mb-4" />
          <h3 className="font-semibold text-heading mb-1">No active project</h3>
          <p className="text-sm text-muted">Complete your payment to see your project progress here.</p>
        </div>
      ) : (
        <>
          {/* Status header */}
          <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider">{order.plan || order.service || "Your Plan"}</p>
                  <p className="text-2xl font-extrabold text-heading mt-1">{pct}%</p>
                </div>
                <div className="w-16 h-16 rounded-full border-[5px] border-accent/20 flex items-center justify-center">
                  <span className="text-lg font-extrabold text-accent">{done}<span className="text-sm text-muted font-normal">/{milestones.length}</span></span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-neutral-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="border-t border-border">
              {milestones.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 px-6 py-4 relative ${
                    m.done ? "bg-accent/[0.02]" : "opacity-30"
                  }`}
                >
                  {/* Connector */}
                  {i < milestones.length - 1 && (
                    <div
                      className={`absolute left-[29px] top-10 bottom-0 w-0.5 ${
                        m.done && milestones[i + 1]?.done ? "bg-accent" : "bg-border"
                      }`}
                    />
                  )}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      m.done
                        ? "bg-accent text-white shadow-lg shadow-accent/20"
                        : "bg-neutral-bg border-2 border-muted text-muted"
                    }`}
                  >
                    {m.done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${m.done ? "text-heading font-semibold" : "text-muted"}`}>
                      {m.label}
                    </p>
                    {i === done && done < milestones.length && (
                      <p className="text-[10px] text-accent mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        In progress
                      </p>
                    )}
                  </div>
                  {m.done && (
                    <span className="text-[10px] text-emerald-400 font-medium">Done</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Order summary card */}
          <div className="rounded-2xl bg-neutral-surface border border-border p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Status</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  order.status === "paid" ? "bg-teal-500/10 text-teal-500" :
                  order.status === "in_progress" ? "bg-blue-500/10 text-blue-500" :
                  order.status === "delivered" ? "bg-emerald-500/10 text-emerald-500" :
                  "bg-amber-500/10 text-amber-500"
                }`}>
                  {order.status === "in_progress" ? "In Progress" : order.status || "pending"}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Amount</p>
                <p className="text-sm font-bold text-heading">
                  {order.amount ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(order.amount) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Since</p>
                <p className="text-sm font-medium text-heading">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
