import { Clock, Loader2, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useDivision } from "@/theme/theme-provider";

interface Milestone { label: string; done: boolean }
interface Order { _id: string; plan?: string; status?: string; milestones?: Milestone[] }

const MILESTONES: Record<string, Milestone[]> = {
  website: [
    { label: "Form submitted", done: true }, { label: "Payment received", done: false },
    { label: "Design in progress", done: false }, { label: "First review ready", done: false },
    { label: "Revisions complete", done: false }, { label: "Site goes live", done: false },
  ],
  gbp: [
    { label: "Form submitted", done: true }, { label: "Profile created", done: false },
    { label: "Google verification", done: false }, { label: "Optimised & live", done: false },
  ],
  default: [
    { label: "Form submitted", done: true }, { label: "Payment received", done: false },
    { label: "Work in progress", done: false }, { label: "Review ready", done: false },
    { label: "Complete", done: false },
  ],
};

function getMilestones(order: Order): Milestone[] {
  const p = (order.plan || "").toLowerCase();
  if (p.includes("web") || p.includes("launch") || p.includes("growth") || p.includes("scale")) return MILESTONES.website;
  if (p.includes("gbp") || p.includes("google") || p.includes("profile")) return MILESTONES.gbp;
  return MILESTONES.default;
}

export default function Progress() {
  const division = useDivision();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!division) return;
    apiRequest<{ orders?: Order[] }>(`/${division}/payments/orders/mine`, {}, division)
      .then((d) => setOrder((d.orders || [])[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [division]);

  const ml = order?.milestones?.length ? order.milestones : getMilestones(order || {} as Order);
  const done = ml.filter((m) => m.done).length;
  const pct = Math.round((done / ml.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Progress</h1>
        <p className="text-sm text-muted mt-0.5">Track your project in real time</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
      ) : !order ? (
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 text-center">
          <Clock className="w-10 h-10 text-muted mx-auto mb-4" />
          <h3 className="font-semibold text-heading mb-1">No active projects</h3>
          <p className="text-sm text-muted">Complete your payment to see your project progress here.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted">{order.plan || "Your Plan"}</p>
                <p className="text-lg font-bold text-heading">{pct}% complete</p>
              </div>
              <div className="w-14 h-14 rounded-full border-4 border-neutral-bg flex items-center justify-center">
                <span className="text-sm font-bold text-accent">{done}/{ml.length}</span>
              </div>
            </div>
            <div className="w-full h-2 bg-neutral-bg rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="border-t border-border divide-y divide-border/40">
            {ml.map((m, i) => (
              <div key={i} className={`flex items-center gap-3 px-6 py-3.5 ${m.done ? "" : "opacity-40"}`}>
                {m.done ? <CheckCircle2 className="w-5 h-5 text-accent shrink-0" /> : <Circle className="w-5 h-5 text-muted shrink-0" />}
                <span className={`text-sm ${m.done ? "text-heading font-medium" : "text-muted"}`}>{m.label}</span>
                {i === done && done < ml.length && <ArrowRight className="w-4 h-4 text-accent animate-pulse ml-auto" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
