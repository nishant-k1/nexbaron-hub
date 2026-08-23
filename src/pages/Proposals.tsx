import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, ApiError, type Division } from "@/lib/api";
import { FileText, CheckCircle2, Clock, ChevronLeft, Check, AlertTriangle, Loader2, CreditCard, Receipt, Filter } from "lucide-react";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

interface ProposalService {
  serviceCode: string;
  name: string;
  description?: string;
}

interface ProposalPricing {
  oneTimeEnabled?: boolean;
  oneTimeFee?: number;
  paymentSchedule?: "FULL_UPFRONT" | "FIFTY_FIFTY";
  recurringEnabled?: boolean;
  recurringFee?: number;
  recurringFrequency?: "MONTHLY" | "ANNUAL";
}

interface Proposal {
  _id: string;
  proposalCode: string;
  packageId: string;
  accountId?: string;
  version: number;
  status: "DRAFT" | "SENT" | "ACCEPTED";
  title: string;
  description?: string;
  services: ProposalService[];
  pricing: ProposalPricing;
  terms?: string;
  notes?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  acceptedVersion?: number;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceLineItem {
  label: string;
  amount: number;
  type: "ONE_TIME" | "RECURRING";
}

interface Payment {
  paymentId: string;
  razorpayPaymentId?: string;
  amount: number;
  status: "INITIATED" | "SUCCESS" | "FAILED" | "REFUNDED";
  at: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  status: "DRAFT" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  amount: number;
  currency: string;
  dueDate?: string;
  lineItems: InvoiceLineItem[];
  payments: Payment[];
  createdAt: string;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFmt = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dateTimeFmt = (s?: string) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const SCHEDULE_LABELS: Record<string, string> = { FULL_UPFRONT: "Full upfront", FIFTY_FIFTY: "50 / 50" };
const FREQUENCY_LABELS: Record<string, string> = { MONTHLY: "Monthly", ANNUAL: "Annual" };

const STATUS_META: Record<Proposal["status"], { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: "Draft", cls: "bg-neutral-bg text-muted", icon: Clock },
  SENT: { label: "Pending", cls: "bg-amber-500/15 text-amber-600", icon: Clock },
  ACCEPTED: { label: "Accepted", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
};

function getProposalDisplayStatus(proposal: Proposal): keyof typeof STATUS_META {
  if (proposal.status === "ACCEPTED") return "ACCEPTED";
  if (proposal.status === "DRAFT") return "DRAFT";
  const sentDate = new Date(proposal.updatedAt || proposal.createdAt);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (sentDate < thirtyDaysAgo) {
    return "EXPIRED" as keyof typeof STATUS_META;
  }
  return "SENT";
}

const STATUS_META_EXTENDED: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  ...STATUS_META,
  EXPIRED: { label: "Expired", cls: "bg-red-500/15 text-red-600", icon: AlertTriangle },
};

const INVOICE_STATUS_META: Record<Invoice["status"], { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: "Draft", cls: "bg-neutral-bg text-muted", icon: Clock },
  PENDING: { label: "Pending", cls: "bg-amber-500/15 text-amber-600", icon: Clock },
  PAID: { label: "Paid", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  FAILED: { label: "Failed", cls: "bg-red-500/15 text-red-600", icon: AlertTriangle },
  CANCELLED: { label: "Cancelled", cls: "bg-neutral-bg text-muted", icon: AlertTriangle },
};

function friendlyAcceptError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session has expired. Please sign in again.";
    if (err.status === 403) return "This proposal isn't available for you to accept.";
    if (err.status === 400) return "This proposal isn't ready to be accepted yet.";
  }
  return "We couldn't submit your response. Please try again in a moment.";
}

declare global {
  interface Window { Razorpay: any }
}

function loadRazorpay(): Promise<typeof window.Razorpay> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Razorpay) return resolve(window.Razorpay);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Could not load payment gateway"));
    document.body.appendChild(script);
  });
}

export default function Proposals() {
  const division = useDivision();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const initialProposal = searchParams.get("proposal");
  const [selected, setSelected] = useState<string | null>(initialProposal);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Invoice state for ACCEPTED proposals
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [paying, setPaying] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");

  // Filter state: "all" | "pending" | "accepted"
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted">("all");

  const load = useCallback(() => {
    if (!division) return;
    setLoading(true);
    apiRequest<{ proposals: Proposal[] }>(`/${division}/proposals`, {}, division as Division)
      .then((d) => { setProposals(d.proposals || []); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load proposals"))
      .finally(() => setLoading(false));
  }, [division]);

  const selectedProposal = proposals.find((p) => p.proposalCode === selected) || null;

  // Filter proposals based on status filter
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return p.status === "SENT";
      if (statusFilter === "accepted") return p.status === "ACCEPTED";
      return true;
    });
  }, [proposals, statusFilter]);

  useEffect(() => { setAgreed(false); setToast(""); load(); }, [load]);

  // Fetch invoice when an ACCEPTED proposal is selected
  useEffect(() => {
    if (!division || !selectedProposal || selectedProposal.status !== "ACCEPTED") {
      setInvoice(null);
      setInvoiceError("");
      setRazorpayKeyId("");
      return;
    }
    let cancelled = false;
    setInvoiceLoading(true);
    setInvoiceError("");
    apiRequest<{ invoice: Invoice; razorpayKeyId?: string }>(`/${division}/proposals/${selectedProposal.proposalCode}/invoice`, {}, division as Division)
      .then((d) => {
        if (!cancelled) {
          setInvoice(d.invoice);
          setRazorpayKeyId(d.razorpayKeyId ?? "");
        }
      })
      .catch((e) => {
        if (!cancelled) setInvoiceError(e instanceof Error ? e.message : "Failed to load invoice");
      })
      .finally(() => {
        if (!cancelled) setInvoiceLoading(false);
      });
    return () => { cancelled = true; };
  }, [division, selectedProposal]);

  const accept = async (code: string) => {
    if (!division) return;
    setAccepting(true);
    setError("");
    try {
      await apiRequest(`/${division}/proposals/${code}/accept`, { method: "POST", body: JSON.stringify({ accept: true }) }, division as Division);
      setToast("Proposal accepted — thank you! We'll get started right away.");
      setAgreed(false);
      load();
    } catch (e) {
      setError(friendlyAcceptError(e));
    } finally {
      setAccepting(false);
    }
  };

  const pay = async (inv: Invoice) => {
    if (!division) return;
    setPaying(true);
    setError("");
    try {
      if (razorpayKeyId) {
        const { order } = await apiRequest<{ success: boolean; order: { id: string; amount: number } }>(
          `/${division}/billing/invoices/${inv.invoiceNumber}/pay`, { method: "POST" }, division as Division
        );
        const Razorpay = await loadRazorpay();
        const rzp = new Razorpay({
          key: razorpayKeyId,
          amount: order.amount,
          currency: inv.currency || "INR",
          name: "Nexbaron",
          description: inv.invoiceNumber,
          order_id: order.id,
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            await apiRequest(`/${division}/billing/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, invoiceNumber: inv.invoiceNumber }),
            }, division as Division);
            setToast("Payment successful — thank you!");
            const fresh = await apiRequest<{ invoice: Invoice }>(`/${division}/proposals/${selectedProposal?.proposalCode}/invoice`, {}, division as Division);
            setInvoice(fresh.invoice);
            setTimeout(() => navigate(`/${division}/orders`), 2000);
          },
          modal: {
            ondismiss: () => setPaying(false),
          },
        });
        rzp.open();
      } else {
        await apiRequest(`/${division}/billing/payments/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceNumber: inv.invoiceNumber }),
        }, division as Division);
        setToast("Payment marked as paid (dev mode).");
        const fresh = await apiRequest<{ invoice: Invoice }>(`/${division}/proposals/${selectedProposal?.proposalCode}/invoice`, {}, division as Division);
        setInvoice(fresh.invoice);
        setTimeout(() => navigate(`/${division}/orders`), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Proposals</h1>
          <p className="text-sm text-muted mt-0.5">Review the plans we've prepared for you and accept the ones you're happy with.</p>
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "accepted")}
            className="appearance-none bg-neutral-surface border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-heading focus:outline-none focus:border-accent/50 pr-10 cursor-pointer"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        </div>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">{toast}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-neutral-surface p-4 text-sm text-red-500">{error}</div>
      )}

      {!selectedProposal && (
        <>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-neutral-surface border border-border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <div>
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-20 rounded mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-24 rounded mt-4" />
                  <Skeleton className="h-3 w-3/4 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="rounded-2xl bg-neutral-surface border border-border p-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-heading mb-1">{proposals.length === 0 ? "No proposals yet" : "No matching proposals"}</h3>
              <p className="text-sm text-muted max-w-[320px]">{proposals.length === 0 ? "When we send you a proposal, it will appear here for your review." : "Try adjusting your filter"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProposals.map((p) => {
                const displayStatus = getProposalDisplayStatus(p);
                const meta = STATUS_META_EXTENDED[displayStatus];
                const Icon = meta.icon;
                return (
                  <button
                    key={p._id}
                    onClick={() => { setSelected(p.proposalCode); setAgreed(false); }}
                    className="cursor-pointer group w-full text-left rounded-2xl bg-neutral-surface border border-border p-4 hover:border-accent/30 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-heading truncate">{p.title}</p>
                        <p className="text-xs text-muted font-mono truncate">{p.proposalCode} · v{p.version} · {dateFmt(p.updatedAt)} {p.services.length > 0 ? `· ${p.services.length} service${p.services.length > 1 ? "s" : ""}` : ""}</p>
                        {p.description && <p className="text-xs text-muted truncate mt-0.5 max-w-[480px]">{p.description}</p>}
                      </div>
                    </div>
                    <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${meta.cls}`}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                    <span className={`sm:hidden inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${meta.cls}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
      {toast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">{toast}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-neutral-surface p-4 text-sm text-red-500">{error}</div>
      )}

      {selectedProposal && (
        <ProposalDetail
          proposal={selectedProposal}
          agreed={agreed}
          accepting={accepting}
          onToggleAgree={() => setAgreed((v) => !v)}
          onAccept={() => accept(selectedProposal.proposalCode)}
          onBack={() => { setSelected(null); setAgreed(false); }}
          invoice={invoice}
          invoiceLoading={invoiceLoading}
          invoiceError={invoiceError}
          paying={paying}
          pay={pay}
        />
      )}
    </div>
  );
}

function ProposalDetail({
  proposal,
  agreed,
  accepting,
  onToggleAgree,
  onAccept,
  onBack,
  invoice,
  invoiceLoading,
  invoiceError,
  paying,
  pay,
}: {
  proposal: Proposal;
  agreed: boolean;
  accepting: boolean;
  onToggleAgree: () => void;
  onAccept: () => void;
  onBack: () => void;
  invoice: Invoice | null;
  invoiceLoading: boolean;
  invoiceError: string;
  paying: boolean;
  pay: (inv: Invoice) => void;
}) {
  const displayStatus = getProposalDisplayStatus(proposal);
  const meta = STATUS_META_EXTENDED[displayStatus];
  const Icon = meta.icon;
  const p = proposal.pricing;

  const showInvoiceSection = proposal.status === "ACCEPTED";

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-muted hover:text-heading transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to proposals
      </button>

      <div className="rounded-2xl bg-neutral-surface border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-heading">{proposal.title}</h2>
            <p className="text-xs text-muted mt-1">{proposal.proposalCode} · Package {proposal.packageId} · Version {proposal.version}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </span>
        </div>

        {proposal.description && <p className="text-sm text-body mt-3">{proposal.description}</p>}

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2">What's included</p>
          {proposal.services.length === 0 ? (
            <p className="text-sm text-muted">No services listed.</p>
          ) : (
            <ul className="space-y-2">
              {proposal.services.map((s) => (
                <li key={s.serviceCode} className="rounded-xl border border-border bg-neutral-bg px-3 py-2.5">
                  <p className="text-sm font-medium text-heading">{s.name}</p>
                  {s.description && <p className="text-xs text-muted mt-0.5">{s.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-neutral-bg p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-1">One-time</p>
            {p.oneTimeEnabled ? (
              <p className="text-sm text-heading">
                {inr.format(p.oneTimeFee || 0)}
                {p.paymentSchedule ? ` · ${SCHEDULE_LABELS[p.paymentSchedule] || p.paymentSchedule}` : ""}
              </p>
            ) : (
              <p className="text-sm text-muted">Not included</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-neutral-bg p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-1">Recurring</p>
            {p.recurringEnabled ? (
              <p className="text-sm text-heading">
                {inr.format(p.recurringFee || 0)} / {FREQUENCY_LABELS[p.recurringFrequency || ""] || p.recurringFrequency || "—"}
              </p>
            ) : (
              <p className="text-sm text-muted">Not included</p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2">Terms & conditions</p>
          <p className="text-sm text-body whitespace-pre-wrap">{proposal.terms || "No specific terms provided."}</p>
        </div>

        {proposal.status === "DRAFT" && (
          <div className="mt-5 rounded-xl border border-border bg-neutral-bg p-4 text-sm text-muted">
            This proposal is still being prepared and isn't ready for your response yet. We'll let you know when it's available.
          </div>
        )}

        {proposal.status === "ACCEPTED" && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Check className="h-4 w-4" />
              <p className="text-sm font-semibold">Proposal accepted</p>
            </div>
            {proposal.acceptedAt && <p className="text-xs text-emerald-700/80 mt-1">Accepted on {dateTimeFmt(proposal.acceptedAt)}</p>}
          </div>
        )}

        {proposal.status === "SENT" && (
          <div className="mt-6 border-t border-border pt-5">
            <label className="flex items-start gap-3 cursor-pointer text-sm text-body">
              <input
                type="checkbox"
                checked={agreed}
                onChange={onToggleAgree}
                className="mt-0.5 accent-[var(--accent)] h-4 w-4"
              />
              <span>I have read and agree to the terms and conditions above.</span>
            </label>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onAccept}
                disabled={!agreed || accepting}
                className="cursor-pointer px-5 py-2.5 bg-accent text-accent-fg rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {accepting ? "Submitting…" : "Accept proposal"}
              </button>
            </div>
          </div>
        )}

        {showInvoiceSection && (
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Invoice</p>
              {invoice && (() => {
                const InvoiceStatusIcon = INVOICE_STATUS_META[invoice.status].icon;
                return (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS_META[invoice.status].cls}`}>
                    <InvoiceStatusIcon className="h-3.5 w-3.5" /> {INVOICE_STATUS_META[invoice.status].label}
                  </span>
                );
              })()}
            </div>

            {invoiceLoading && (
              <div className="space-y-4 animate-pulse">
                <SkeletonCard />
                <SkeletonCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-6 w-40 rounded" />
                        <Skeleton className="h-4 w-40 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-24 rounded" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                  </div>
                  <SkeletonList items={3} />
                </SkeletonCard>
                <SkeletonCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-6 w-40 rounded" />
                        <Skeleton className="h-4 w-40 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-24 rounded" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                  </div>
                  <SkeletonTable rows={12} />
                  <SkeletonList items={4} />
                </SkeletonCard>
              </div>
            )}

            {invoiceError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
                {invoiceError}
              </div>
            )}

            {invoice && (
              <>
                {invoice.lineItems.length > 0 && (
                  <ul className="divide-y divide-border/60">
                    {invoice.lineItems.map((li, i) => (
                      <li key={i} className="flex justify-between text-sm py-1.5">
                        <span className="text-body">{li.label}</span>
                        <span className="text-heading font-medium">{inr.format(li.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-heading">{inr.format(invoice.amount)}</span>
                  {invoice.status === "PENDING" && (
                    <button
                      onClick={() => pay(invoice)}
                      disabled={paying}
                      className="cursor-pointer px-5 py-2.5 bg-accent text-accent-fg rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                    >
                      {paying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Pay now
                        </>
                      )}
                    </button>
                  )}
                  {invoice.status === "PAID" && (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Payment completed</span>
                      {invoice.payments.length > 0 && (
                        <span className="text-xs text-muted">
                          Paid on {dateTimeFmt(invoice.payments[invoice.payments.length - 1].at)}
                        </span>
                      )}
                    </div>
                  )}
                  {invoice.status === "FAILED" && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Payment failed</span>
                    </div>
                  )}
                </div>

                {invoice.dueDate && (
                  <p className="mt-2 text-xs text-muted">Due by {dateFmt(invoice.dueDate)}</p>
                )}
              </>
            )}

            {!invoice && !invoiceLoading && !invoiceError && (
              <div className="rounded-xl border border-border bg-neutral-bg p-4 text-sm text-muted">
                No invoice found for this proposal. Please contact support.
              </div>
            )}
          </div>
        )}
      </div>
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