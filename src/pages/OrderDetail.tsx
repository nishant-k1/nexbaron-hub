import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import {
  FileText,
  Loader2,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  ArrowLeft,
  CreditCard as CreditCardIcon,
} from "lucide-react";
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList } from "@/components/ui/Skeleton";

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-600", icon: Clock },
  paid: { label: "Paid", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  in_progress: { label: "In Progress", cls: "bg-blue-500/15 text-blue-600", icon: Truck },
  delivered: { label: "Delivered", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", cls: "bg-neutral-bg text-muted", icon: AlertTriangle },
};

const MILESTONE_STATUS_META: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", cls: "bg-neutral-bg text-muted", icon: Clock },
  in_progress: { label: "In Progress", cls: "bg-blue-500/15 text-blue-600", icon: Truck },
  done: { label: "Done", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
};

interface OrderItem {
  kind: string;
  label: string;
  billingCycle: string;
  price: number;
  costPrice?: number;
  quantity: number;
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
  amount: number;
  currency: string;
  status: string;
  items: OrderItem[];
  milestones: Milestone[];
  customer: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    city?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetail() {
  const division = useDivision();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!division || !id) return;
    let active = true;
    setLoading(true);
    apiRequest<{ success: boolean; order: Order }>(`/${division}/orders/${id}`, {}, division as Division)
      .then((d) => {
        if (!active) return;
        setOrder(d.order);
        setError("");
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load order");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [division, id]);

  const handleBillingDetails = () => {
    if (!order?.invoiceNumber) return;
    navigate(`/${division}/billing/${encodeURIComponent(order.invoiceNumber)}`);
  };

  const handleProposalDetails = () => {
    if (!order?.proposalCode) return;
    navigate(`/${division}/proposals?proposal=${encodeURIComponent(order.proposalCode)}`);
  };

  if (!id) return null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div>
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-4 w-40 rounded mt-1" />
          </div>
        </div>
        
        <SkeletonCard>
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
          </div>
          <SkeletonTable rows={8} />
        </SkeletonCard>
        
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <SkeletonCard>
            <Skeleton className="h-6 w-40 rounded mb-4" />
            <SkeletonTable rows={6} />
          </SkeletonCard>
          <SkeletonCard>
            <Skeleton className="h-6 w-32 rounded mb-4" />
            <SkeletonList items={4} />
            <Skeleton className="h-12 w-full rounded-xl mt-4" />
          </SkeletonCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border border-red-500/30 bg-neutral-surface p-4 text-sm text-red-500">{error}</div>
        <button onClick={() => navigate(`/${division}/orders`)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </button>
      </div>
    );
  }

  if (!order) return null;

  const meta = STATUS_META[order.status] || { label: order.status, cls: "bg-neutral-bg text-muted", icon: FileText };
  const Icon = meta.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/${division}/orders`)} className="cursor-pointer p-2 rounded-lg hover:bg-neutral-bg transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-heading">{order.projectId}</h1>
          <p className="text-sm text-muted mt-0.5">Order details and delivery timeline</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${meta.cls}`}>
            <Icon className="h-4 w-4" /> {meta.label}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Delivery Milestones - Left column, full height */}
        <div className="rounded-2xl bg-neutral-surface border border-border p-6">
          <h2 className="text-xl font-bold text-heading mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-accent" />
            Delivery Milestones
          </h2>
          {order.milestones.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">
              <Truck className="h-8 w-8 mx-auto mb-2 text-muted" />
              <p>No milestones defined yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {order.milestones.map((ms, i) => {
                const mMeta = MILESTONE_STATUS_META[ms.status] || { label: ms.status, cls: "bg-neutral-bg text-muted", icon: Clock };
                const MilestoneIcon = mMeta.icon;
                const isLast = i === order.milestones.length - 1;
                return (
                  <div key={ms.key || i} className="relative flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center relative z-10">
                      <div className={`w-3 h-3 rounded-full border-2 ${ms.status === "done" ? "bg-emerald-500 border-emerald-500" : ms.status === "in_progress" ? "bg-blue-500 border-blue-500" : "bg-transparent border-muted"} flex items-center justify-center`}>
                        {ms.status === "done" && <CheckCircle2 className="h-2 w-2 text-white" />}
                      </div>
                      {!isLast && <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-border/60" />}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-heading">{ms.label}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${mMeta.cls}`}>
                          <MilestoneIcon className="h-3 w-3" /> {mMeta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted">{ms.dayLabel}</p>
                      {ms.date && <p className="text-xs text-muted">Target: {new Date(ms.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
                      {ms.completedAt && <p className="text-xs text-emerald-600">Completed: {new Date(ms.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Info - Right column, sticky */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-2xl bg-neutral-surface border border-border p-6">
            <h3 className="font-semibold text-heading mb-4">Order Info</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Order ID</dt><dd className="text-body font-mono text-xs">{order._id}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Project ID</dt><dd className="text-body font-mono text-xs">{order.projectId}</dd></div>
              {order.invoiceNumber && <div className="flex justify-between"><dt className="text-muted">Invoice</dt><dd className="text-body font-mono text-xs">{order.invoiceNumber}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Created</dt><dd className="text-body">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Updated</dt><dd className="text-body">{new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
            </dl>
            
            {order.invoiceNumber && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={handleBillingDetails}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90"
                  >
                    <CreditCardIcon className="h-4 w-4" /> View billing details
                  </button>
                  {order.proposalCode && (
                    <button
                      onClick={handleProposalDetails}
                      className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-neutral-surface font-semibold text-sm rounded-xl hover:bg-neutral-bg transition-colors"
                    >
                      <FileText className="h-4 w-4" /> View proposal details
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}