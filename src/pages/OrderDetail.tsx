import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import { useEntityLabels } from "@/lib/metadata";
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
  Globe,
  ExternalLink,
  Copy,
  Share2,
  Link2,
} from "lucide-react";
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList } from "@/components/ui/Skeleton";

const ORDER_STATUS_CLS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600",
  cancelled: "bg-neutral-bg text-muted",
};

const PAYMENT_STATUS_CLS: Record<string, string> = {
  unpaid: "bg-neutral-bg text-muted",
  partially_paid: "bg-amber-500/15 text-amber-600",
  fully_paid: "bg-emerald-500/15 text-emerald-600",
};

const ORDER_STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  active: CheckCircle2,
  cancelled: AlertTriangle,
};

const MILESTONE_STATUS_CLS: Record<string, string> = {
  pending: "bg-neutral-bg text-muted",
  in_progress: "bg-blue-500/15 text-blue-600",
  done: "bg-emerald-500/15 text-emerald-600",
};

const MILESTONE_STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  in_progress: Truck,
  done: CheckCircle2,
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
  paymentStatus: string;
  planLabel?: string;
  items: OrderItem[];
  milestones: Milestone[];
  customer: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    city?: string;
  };
  stagingUrl?: string;
  liveWebsiteUrl?: string;
  liveUrls?: { label: string; url: string }[];
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    twitter?: string;
  };
  googleBusinessProfile?: {
    created: boolean;
    verified: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetail() {
  const division = useDivision();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderLabels = useEntityLabels("order");
  const milestoneLabels = useEntityLabels("milestone");
  const paymentStatusLabels = useEntityLabels("paymentStatus");
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

  const [copied, setCopied] = useState<string | null>(null);
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleProposalDetails = () => {
    if (!order?.proposalCode) return;
    navigate(`/${division}/proposals/${order.proposalCode}`);
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
        
        <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-[1fr_360px]">
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

  const label = orderLabels[order.status] || order.status;
  const cls = ORDER_STATUS_CLS[order.status] || "bg-neutral-bg text-muted";
  const Icon = ORDER_STATUS_ICON[order.status] || FileText;

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <button onClick={() => navigate(`/${division}/orders`)} className="cursor-pointer p-2 rounded-lg hover:bg-neutral-bg transition-colors min-h-11 min-w-11 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-heading truncate">{order.planLabel || order.service || "Order"}</h1>
          <p className="text-sm text-muted mt-0.5">Order details</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${PAYMENT_STATUS_CLS[order.paymentStatus] || "bg-neutral-bg text-muted"}`}>
            {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${cls}`}>
            <Icon className="h-4 w-4" /> {label}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-[1fr_360px]">
        {/* Delivery Milestones - Only show if there are milestones */}
        {order.milestones.length > 0 && (
        <div className="rounded-2xl bg-neutral-surface border border-border p-4 sm:p-6">
          <h2 className="text-xl font-bold text-heading mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-accent" />
            Delivery Milestones
          </h2>
            <div className="space-y-4">
              {order.milestones.map((ms, i) => {
                const mLabel = milestoneLabels[ms.status] || ms.status;
                const mCls = MILESTONE_STATUS_CLS[ms.status] || "bg-neutral-bg text-muted";
                const MilestoneIcon = MILESTONE_STATUS_ICON[ms.status] || Clock;
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
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${mCls}`}>
                          <MilestoneIcon className="h-3 w-3" /> {mLabel}
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
        </div>
        )}

        {/* Order Info - Right column, sticky */}
        <div className="xl:sticky xl:top-24">
          <div className="rounded-2xl bg-neutral-surface border border-border p-4 sm:p-6">
            <h3 className="font-semibold text-heading mb-4">Order Info</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted shrink-0">Order ID</dt><dd className="text-body font-mono text-xs break-all text-right truncate">{order._id}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted shrink-0">Project ID</dt><dd className="text-body font-mono text-xs break-all text-right truncate">{order.projectId}</dd></div>
              {order.invoiceNumber && <div className="flex justify-between gap-3"><dt className="text-muted shrink-0">Invoice</dt><dd className="text-body font-mono text-xs break-all text-right truncate">{order.invoiceNumber}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-muted shrink-0">Created</dt><dd className="text-body text-right">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted shrink-0">Updated</dt><dd className="text-body text-right">{new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
            </dl>
            
            {order.invoiceNumber && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  <button
                    onClick={handleBillingDetails}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90 min-h-11"
                  >
                    <CreditCardIcon className="h-4 w-4" /> View billing details
                  </button>
                  {order.proposalCode && (
                    <button
                      onClick={handleProposalDetails}
                      className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-neutral-surface font-semibold text-sm rounded-xl hover:bg-neutral-bg transition-colors min-h-11"
                    >
                      <FileText className="h-4 w-4" /> View proposal details
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Product Details Card - Only show if there's website data */}
          {(order.liveWebsiteUrl || order.stagingUrl || (order.liveUrls && order.liveUrls.length > 0)) && (
          <div className="rounded-2xl bg-neutral-surface border border-border p-4 sm:p-6 mt-4 sm:mt-6">
            <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" />
              Live Product Details
            </h3>
            
              <div className="space-y-4">
                {/* Live Website */}                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2">
                    {order.liveWebsiteUrl ? "Live Website" : order.stagingUrl ? "Staging Website" : "Live Domains"}
                  </p>
                  {(order.liveWebsiteUrl || order.stagingUrl) && (
                    <>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 rounded-xl bg-neutral-bg border border-border">
                        <Globe className="h-4 w-4 text-accent shrink-0" />
                        <a
                          href={order.liveWebsiteUrl || order.stagingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-accent hover:underline truncate flex-1 min-w-0 break-all"
                        >
                          {order.liveWebsiteUrl || order.stagingUrl}
                        </a>
                        <button
                          onClick={() => copyToClipboard(order.liveWebsiteUrl || order.stagingUrl || "", "website")}
                          className="p-2 rounded-lg hover:bg-neutral-surface text-muted hover:text-heading transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center"
                          title="Copy link"
                        >
                          {copied === "website" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <a
                          href={order.liveWebsiteUrl || order.stagingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-neutral-surface text-muted hover:text-heading transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      {order.liveWebsiteUrl && order.stagingUrl && order.liveWebsiteUrl !== order.stagingUrl && (
                        <div className="mt-3">
                          <p className="text-xs text-muted mb-1">Staging URL</p>
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-bg/50 border border-border/50">
                            <span className="text-xs text-muted truncate flex-1 min-w-0 break-all">{order.stagingUrl}</span>
                            <button
                              onClick={() => copyToClipboard(order.stagingUrl || "", "staging")}
                              className="p-2 rounded hover:bg-neutral-surface text-muted hover:text-heading shrink-0 min-h-11 min-w-11 flex items-center justify-center"
                            >
                              {copied === "staging" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {order.liveUrls && order.liveUrls.length > 0 && (
                    <div className={order.liveWebsiteUrl || order.stagingUrl ? "mt-3" : ""}>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2 flex items-center gap-1.5"><Link2 className="h-3 w-3" /> Additional domains</p>
                      <div className="space-y-2">
                        {order.liveUrls.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-bg border border-border hover:border-accent/30 transition-colors group">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                              <Globe className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-heading">{entry.label}</p>
                              <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline truncate block">{entry.url}</a>
                            </div>
                            <button
                              onClick={() => copyToClipboard(entry.url, `liveUrl-${idx}`)}
                              className="p-2 rounded-lg hover:bg-neutral-surface text-muted hover:text-heading transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center"
                              title="Copy link"
                            >
                              {copied === `liveUrl-${idx}` ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <a href={entry.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-neutral-surface text-muted hover:text-heading transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center" title="Open">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Social Media Links */}
                {(order.socialLinks?.instagram || order.socialLinks?.facebook || order.socialLinks?.linkedin || order.socialLinks?.twitter) && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2">Social Media</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {order.socialLinks.instagram && (
                        <a href={order.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-bg border border-border hover:border-accent/30 hover:bg-accent/5 transition-colors group">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shrink-0">
                            <Share2 className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-medium text-heading group-hover:text-accent truncate">Instagram</span>
                          <ExternalLink className="h-3 w-3 text-muted ml-auto shrink-0" />
                        </a>
                      )}
                      {order.socialLinks.facebook && (
                        <a href={order.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-bg border border-border hover:border-accent/30 hover:bg-accent/5 transition-colors group">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                            <Share2 className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-medium text-heading group-hover:text-accent truncate">Facebook</span>
                          <ExternalLink className="h-3 w-3 text-muted ml-auto shrink-0" />
                        </a>
                      )}
                      {order.socialLinks.linkedin && (
                        <a href={order.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-bg border border-border hover:border-accent/30 hover:bg-accent/5 transition-colors group">
                          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white shrink-0">
                            <Share2 className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-medium text-heading group-hover:text-accent truncate">LinkedIn</span>
                          <ExternalLink className="h-3 w-3 text-muted ml-auto shrink-0" />
                        </a>
                      )}
                      {order.socialLinks.twitter && (
                        <a href={order.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-bg border border-border hover:border-accent/30 hover:bg-accent/5 transition-colors group">
                          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                            <Share2 className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-medium text-heading group-hover:text-accent truncate">Twitter</span>
                          <ExternalLink className="h-3 w-3 text-muted ml-auto shrink-0" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Google Business Profile */}
                {order.googleBusinessProfile && (
                  <div className="pt-4 border-t border-border/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2">Google Business</p>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${order.googleBusinessProfile.verified ? "bg-emerald-500" : order.googleBusinessProfile.created ? "bg-amber-500" : "bg-muted"}`} />
                      <span className="text-body">
                        {order.googleBusinessProfile.verified ? "Verified" : order.googleBusinessProfile.created ? "Created - pending verification" : "Not yet created"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}