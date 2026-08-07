import { Clock, Loader2, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { useDivision } from "@/theme/theme-provider";

interface Milestone {
  label: string;
  done: boolean;
}

interface Order {
  _id: string;
  plan?: string;
  status?: string;
  milestones?: Milestone[];
}

const DEFAULT_MILESTONES: Milestone[] = [
  { label: "Onboarding form submitted", done: true },
  { label: "Payment received", done: true },
  { label: "Design in progress", done: false },
  { label: "First review ready", done: false },
  { label: "Revisions complete", done: false },
  { label: "Site goes live", done: false },
];

export default function Progress() {
  const division = useDivision();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!division) return;
    apiRequest<{ success: boolean; orders?: Order[] }>(`/${division}/payments/orders/mine`, {}, division)
      .then((data) => {
        const orders = data.orders || [];
        setOrder(orders.length > 0 ? orders[0] : null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [division]);

  const milestones = order?.milestones?.length ? order.milestones : DEFAULT_MILESTONES;
  const doneCount = milestones.filter((m) => m.done).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">Track Progress</h1>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : !order ? (
        <div className="p-12 rounded-xl bg-neutral-surface border border-border text-center">
          <Clock className="h-10 w-10 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-heading mb-2">No active projects</h3>
          <p className="text-sm text-muted">
            Your project progress will appear here once you have an active order.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-neutral-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted">Current plan</p>
                <p className="text-lg font-bold text-heading">{order.plan || "Active order"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted">Progress</p>
                <p className="text-lg font-bold text-accent">{doneCount}/{milestones.length}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-neutral-bg rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / milestones.length) * 100}%` }}
              />
            </div>

            {/* Milestones */}
            <div className="space-y-1">
              {milestones.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                    m.done ? "text-heading" : "text-muted"
                  }`}
                >
                  {m.done ? (
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 shrink-0" />
                  )}
                  <span className="text-sm">{m.label}</span>
                  {i === milestones.filter((m) => m.done).length && (
                    <ArrowRight className="w-4 h-4 text-accent animate-pulse ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
