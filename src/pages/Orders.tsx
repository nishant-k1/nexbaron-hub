import { FileText, Loader2, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { useDivision } from "@/theme/theme-provider";

interface Order {
  _id: string;
  plan?: string;
  amount?: number;
  status?: string;
  createdAt: string;
}

export default function Orders() {
  const division = useDivision();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!division) return;
    apiRequest<{ success: boolean; orders?: Order[] }>(`/${division}/payments/orders/mine`, {}, division)
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [division]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">My Orders</h1>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 rounded-xl bg-neutral-surface border border-border text-center">
          <FileText className="h-10 w-10 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-heading mb-2">No orders yet</h3>
          <p className="text-sm text-muted mb-4">
            Your order history will appear here once you purchase a plan.
          </p>
          <a
            href={`https://nexbaron.com/${division}/pricing`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            View plans <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-surface">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-mono text-muted uppercase">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-mono text-muted uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b border-border hover:bg-neutral-bg transition-colors">
                  <td className="px-4 py-3 text-heading font-medium">{order.plan || "—"}</td>
                  <td className="px-4 py-3 text-heading">
                    {order.amount ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(order.amount) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted capitalize">
                      {order.status || "processing"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-right">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
