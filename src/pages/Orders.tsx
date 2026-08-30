import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import { useEntityLabels } from "@/lib/metadata";
import {
  ArrowRight,
  Package,
  CheckCircle2,
  AlertTriangle,
  Filter,
  FileText,
} from "lucide-react";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

interface OrderItem {
  kind: string;
  label: string;
  price: number;
}

interface Milestone {
  key: string;
  label: string;
  dayLabel: string;
  date?: string;
  status: "pending" | "in_progress" | "done";
  completedAt?: string;
}

interface Order {
  _id: string;
  projectId: string;
  invoiceNumber?: string;
  proposalCode?: string;
  service?: string;
  planLabel?: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    city?: string;
  };
}

// Filter options come from the API catalog (SSOT) — no hardcoded business data.
const PLAN_FILTER_DEFAULT = [{ value: "", label: "All Plans" }];

const ORDER_STATUS_CLS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600",
  cancelled: "bg-neutral-bg text-muted",
};

const ORDER_STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  active: CheckCircle2,
  cancelled: AlertTriangle,
};

export default function Orders() {
  const division = useDivision();
  const navigate = useNavigate();
  const orderLabels = useEntityLabels("order");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [packageFilter, setPackageFilter] = useState("");
  const [packageOptions, setPackageOptions] = useState<{ value: string; label: string }[]>(PLAN_FILTER_DEFAULT);

  useEffect(() => {
    if (!division) return;
    let active = true;
    setLoading(true);
    apiRequest<{ success: boolean; orders: Order[] }>(`/${division}/orders`, {}, division as Division)
      .then((d) => {
        if (!active) return;
        setOrders(d.orders || []);
        setError("");
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load orders");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [division]);

  useEffect(() => {
    if (!division) return;
    let active = true;
    apiRequest<{ plans: { id: string; name: string }[] }>(`/${division}/catalog`, {}, division as Division)
      .then((d) => {
        if (!active) return;
        const opts = [{ value: "", label: "All Plans" }, ...(d.plans || []).map((p) => ({ value: p.id, label: p.name }))];
        setPackageOptions(opts);
      })
      .catch(() => {
        if (!active) return;
        setPackageOptions(PLAN_FILTER_DEFAULT);
      });
    return () => {
      active = false;
    };
  }, [division]);

  const handleViewOrder = (orderId: string) => {
    navigate(`/${division}/orders/${orderId}`);
  };

  // Filter orders based on package filter
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesPackage = !packageFilter || order.service === packageFilter;
      return matchesPackage;
    });
  }, [orders, packageFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-heading">Orders</h1>
          <p className="text-sm text-muted mt-0.5">Track your orders and delivery progress.</p>
        </div>
        <div className="relative self-start sm:self-auto shrink-0">
          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="appearance-none bg-neutral-surface border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-heading focus:outline-none focus:border-accent/50 pr-10 cursor-pointer min-h-11"
          >
            {packageOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-neutral-surface p-4 text-sm text-red-500">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div>
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-20 rounded mt-1" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-6 w-24 rounded mt-4" />
              <div className="mt-3 pt-3 border-t border-border/60">
                <Skeleton className="h-3 w-16 rounded mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-heading mb-1">
            {packageFilter ? "No matching orders" : "No orders yet"}
          </h3>
          <p className="text-sm text-muted max-w-[320px]">
            {packageFilter ? "Try adjusting your filter" : "Orders appear here after your payment is confirmed."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const label = orderLabels[order.status] || order.status;
            const cls = ORDER_STATUS_CLS[order.status] || "bg-neutral-bg text-muted";
            const Icon = ORDER_STATUS_ICON[order.status] || FileText;
            return (
              <div
                key={order._id}
                role="button"
                tabIndex={0}
                className="group rounded-2xl bg-neutral-surface border border-border p-4 sm:p-5 cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => handleViewOrder(order._id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleViewOrder(order._id); }}
              >
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Package className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-heading truncate">{order.planLabel || order.service || "Order"}</p>
                      <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <ul className="space-y-2 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <li key={i} className="flex justify-between text-sm py-2 px-3 rounded-lg bg-neutral-bg">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </li>
      ))}
    </ul>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden animate-pulse">
      <div className="bg-neutral-bg border-b border-border p-3">
        <div className="flex gap-4">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-3">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}