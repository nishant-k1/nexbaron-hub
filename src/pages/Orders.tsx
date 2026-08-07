import { FileText, Loader2, ExternalLink, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useDivision } from "@/theme/theme-provider";

interface Order { _id: string; plan?: string; amount?: number; status?: string; createdAt: string }

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STATUS: Record<string, string> = {
  paid: "bg-teal-500/10 text-teal-500", pending: "bg-amber-500/10 text-amber-500",
  in_progress: "bg-blue-500/10 text-blue-500", delivered: "bg-emerald-500/10 text-emerald-500",
  cancelled: "bg-red-500/10 text-red-500",
};

export default function Orders() {
  const division = useDivision();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!division) return;
    apiRequest<{ orders?: Order[] }>(`/${division}/payments/orders/mine`, {}, division)
      .then((d) => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [division]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Orders</h1>
        <p className="text-sm text-muted mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 text-center">
          <FileText className="w-10 h-10 text-muted mx-auto mb-4" />
          <h3 className="font-semibold text-heading mb-1">No orders yet</h3>
          <p className="text-sm text-muted">Your purchases will appear here.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
          <div className="divide-y divide-border/60">
            {orders.map((o) => (
              <div key={o._id} className="flex items-center justify-between px-6 py-4 hover:bg-neutral-bg transition-colors">
                <div>
                  <p className="font-medium text-heading">{o.plan || "Order"}</p>
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <IndianRupee className="w-3 h-3" />{o.amount ? MONEY.format(o.amount) : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS[o.status || ""] || STATUS.pending}`}>
                    {(o.status || "pending").replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
