import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, ApiError, type Division, getApiUrl, getToken } from "@/lib/api";
import { useEntityLabels } from "@/lib/metadata";
import { FileText, CheckCircle2, Clock, ChevronLeft, Check, AlertTriangle, Loader2, CreditCard, Receipt, Filter, X, ArrowRight, Download, ExternalLink, Maximize } from "lucide-react";
import { toast } from "sonner";
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
  status: "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED";
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

const PROPOSAL_STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-neutral-bg text-muted",
  SENT: "bg-amber-500/15 text-amber-600",
  ACCEPTED: "bg-emerald-500/15 text-emerald-600",
  EXPIRED: "bg-red-500/15 text-red-600",
};

const PROPOSAL_STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  DRAFT: Clock,
  SENT: Clock,
  ACCEPTED: CheckCircle2,
  EXPIRED: AlertTriangle,
};

const INVOICE_STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-neutral-bg text-muted",
  PENDING: "bg-amber-500/15 text-amber-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
  FAILED: "bg-red-500/15 text-red-600",
  CANCELLED: "bg-neutral-bg text-muted",
};

const INVOICE_STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  DRAFT: Clock,
  PENDING: Clock,
  PAID: CheckCircle2,
  FAILED: AlertTriangle,
  CANCELLED: AlertTriangle,
};

function getProposalDisplayStatus(proposal: Proposal): string {
  return proposal.status;
}

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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const proposalLabels = useEntityLabels("proposal");
  const invoiceLabels = useEntityLabels("invoice");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const urlProposal = searchParams.get("proposal");
  const [selected, setSelected] = useState<string | null>(urlProposal);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Invoice state for ACCEPTED proposals
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [paying, setPaying] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [paymentSuccessInvoice, setPaymentSuccessInvoice] = useState<Invoice | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<Proposal | null>(null);
  const [showPayOptions, setShowPayOptions] = useState(false);

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

  const selectedProposal = proposals.find((p) => p.proposalCode === (selected || urlProposal)) || null;

  // Filter proposals based on status filter
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return p.status === "SENT";
      if (statusFilter === "accepted") return p.status === "ACCEPTED";
      return true;
    });
  }, [proposals, statusFilter]);

  useEffect(() => { setAgreed(false); load(); }, [load]);

  // Sync selected with ?proposal= URL param on mount and navigation
  useEffect(() => {
    const proposal = new URLSearchParams(location.search).get("proposal");
    if (proposal) {
      setSelected(proposal);
    }
  }, [location.search]);

  // Ensure selected is set from URL on initial mount (belt-and-suspenders)
  useEffect(() => {
    if (!selected && urlProposal) {
      setSelected(urlProposal);
    }
  }, []);

  // Scroll to detail view when a proposal is selected from URL
  useEffect(() => {
    if (selectedProposal) {
      const el = document.getElementById("proposal-detail");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedProposal]);

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
      setAgreed(false);
      setSelected(code);
      setStatusFilter("all");
      const accepted = proposals.find((p) => p.proposalCode === code) || null;
      if (accepted) setAcceptSuccess(accepted);
      load();
    } catch (e) {
      toast.error(friendlyAcceptError(e), { duration: 4000 });
    } finally {
      setAccepting(false);
    }
  };

  const pay = async (inv: Invoice, amount?: number) => {
    if (!division) return;
    setPaying(true);
    // keep chooser dialog open — show processing inside dialog itself (not on page)
    setError("");
    const payAmount = amount ?? inv.amount;
    try {
      if (razorpayKeyId) {
        const { order } = await apiRequest<{ success: boolean; order: { id: string; amount: number } }>(
          `/${division}/billing/invoices/${inv.invoiceNumber}/pay`, { method: "POST", body: JSON.stringify({ amount: payAmount }) }, division as Division
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
            try {
              const verifyRes = await apiRequest<{ success: boolean; orderId?: string }>(`/${division}/billing/payments/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...response, invoiceNumber: inv.invoiceNumber, amount: payAmount }),
              }, division as Division);
              const fresh = await apiRequest<{ invoice: Invoice }>(`/${division}/proposals/${selectedProposal?.proposalCode}/invoice`, {}, division as Division);
              setInvoice(fresh.invoice);
              setShowPayOptions(false);
              setPaying(false);
              setPaymentSuccessInvoice(fresh.invoice);
              if (verifyRes.orderId) setPaymentOrderId(verifyRes.orderId);
            } catch (e) {
              setPaying(false);
              toast.error(e instanceof Error ? e.message : "Payment verification failed");
            }
          },
          modal: {
            ondismiss: () => setPaying(false),
          },
        });
        rzp.open();
      } else {
        // Dev fallback: Razorpay not configured — simulate payment
        if (!window.confirm("Razorpay is not configured in dev mode. Simulate payment as PAID?")) {
          setPaying(false);
          return;
        }
        const verifyRes2 = await apiRequest<{ success: boolean; orderId?: string }>(`/${division}/billing/payments/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceNumber: inv.invoiceNumber, amount: payAmount }),
        }, division as Division);
        const fresh = await apiRequest<{ invoice: Invoice }>(`/${division}/proposals/${selectedProposal?.proposalCode}/invoice`, {}, division as Division);
        setInvoice(fresh.invoice);
        setShowPayOptions(false);
        setPaying(false);
        setPaymentSuccessInvoice(fresh.invoice);
        if (verifyRes2.orderId) setPaymentOrderId(verifyRes2.orderId);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed", { duration: 4000 });
      setPaying(false);
      // keep chooser open to retry — don't close on error
    }
    // for Razorpay flow, keep paying=true until handler/dismiss; no finally reset
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-heading">Proposals</h1>
          <p className="text-sm text-muted mt-0.5">Review the plans we've prepared for you and accept the ones you're happy with.</p>
        </div>
        <div className="relative self-start sm:self-auto shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "accepted")}
            className="appearance-none bg-neutral-surface border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-heading focus:outline-none focus:border-accent/50 pr-10 cursor-pointer min-h-11"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        </div>
      </div>

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
                const label = proposalLabels[displayStatus] || displayStatus;
                const cls = PROPOSAL_STATUS_CLS[displayStatus] || "bg-neutral-bg text-muted";
                const Icon = PROPOSAL_STATUS_ICON[displayStatus] || Clock;
                return (
                  <div
                    key={p._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelected(p.proposalCode); setAgreed(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setSelected(p.proposalCode); setAgreed(false); } }}
                    className="group rounded-2xl bg-neutral-surface border border-border p-4 sm:p-5 cursor-pointer hover:border-accent/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-heading truncate text-sm">{p.title}</p>
                          <p className="text-xs text-muted font-mono truncate">{p.proposalCode} · v{p.version} · {dateFmt(p.updatedAt)} {p.services.length > 0 ? `· ${p.services.length} service${p.services.length > 1 ? "s" : ""}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
                          <Icon className="h-3.5 w-3.5" /> {label}
                        </span>
                        <span className="text-xs text-muted group-hover:text-accent">→</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
          onShowPayOptions={() => setShowPayOptions(true)}
          proposalLabels={proposalLabels}
          invoiceLabels={invoiceLabels}
        />
      )}

      {showPayOptions && invoice && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 cursor-pointer" onClick={() => !paying && setShowPayOptions(false)}>
          <div className="bg-neutral-surface rounded-2xl w-full max-w-md border border-border shadow-2xl p-6 cursor-default" onClick={(e) => e.stopPropagation()}>
            {paying ? (
              <div className="py-10 flex flex-col items-center text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="mt-4 text-sm font-semibold text-heading">Processing payment…</p>
                <p className="text-xs text-muted mt-1">Please complete the payment window. Don't close this dialog.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-heading">Choose amount</h3>
                  <button onClick={() => setShowPayOptions(false)} className="cursor-pointer p-1.5 rounded-xl hover:bg-neutral-bg text-muted"><X className="w-5 h-5" /></button>
                </div>
                {!razorpayKeyId && (
                  <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                    Dev mode — Razorpay is not configured. Payment will be simulated (no real money collected).
                  </div>
                )}
                <p className="text-sm text-muted mb-4">Pay 50% advance or the full amount. Total {inr.format(invoice.amount)}.</p>
                <div className="space-y-3">
                  <button onClick={() => pay(invoice, Math.round(invoice.amount / 2))} disabled={paying} className="cursor-pointer w-full p-4 rounded-2xl border border-border bg-neutral-bg hover:border-accent/30 flex items-center justify-between disabled:opacity-50 text-left">
                    <div><p className="font-medium text-heading text-sm">Pay 50% advance</p><p className="text-xs text-muted mt-0.5">{inr.format(Math.round(invoice.amount / 2))} now · remaining {inr.format(invoice.amount - Math.round(invoice.amount / 2))} later</p></div><ArrowRight className="h-5 w-5 text-muted" />
                  </button>
                  <button onClick={() => pay(invoice, invoice.amount)} disabled={paying} className="cursor-pointer w-full p-4 rounded-2xl bg-accent text-accent-fg flex items-center justify-between disabled:opacity-50 text-left">
                    <div><p className="font-semibold text-sm">Pay full amount</p><p className="text-xs text-accent-fg/70 mt-0.5">{inr.format(invoice.amount)}</p></div><ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                <button onClick={() => setShowPayOptions(false)} className="cursor-pointer w-full mt-3 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg">Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {(acceptSuccess || paymentSuccessInvoice) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => {
            setAcceptSuccess(null);
            setPaymentSuccessInvoice(null);
          }}
        >
          <div
            className="bg-neutral-surface rounded-2xl w-full max-w-md shadow-2xl p-6 transition-all duration-300 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {paymentSuccessInvoice ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => setPaymentSuccessInvoice(null)}
                    className="cursor-pointer w-8 h-8 rounded-lg hover:bg-neutral-bg text-muted hover:text-heading flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-heading animate-in fade-in slide-in-from-bottom-1 duration-300">Payment confirmed</h3>
                <p className="text-sm text-muted mt-1 animate-in fade-in duration-300">Your payment for <span className="font-mono font-medium text-heading">{paymentSuccessInvoice.invoiceNumber}</span> was successful.</p>
                <p className="text-sm text-body mt-3 animate-in fade-in duration-300 delay-100">Would you like to view your order details now?</p>
                <div className="mt-6 flex justify-end gap-3 animate-in fade-in duration-300 delay-150">
                  <button
                    onClick={() => {
                      setPaymentSuccessInvoice(null);
                      setAcceptSuccess(null);
                    }}
                    className="cursor-pointer px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg"
                  >
                    Stay here
                  </button>
                  <button
                    onClick={async () => {
                      const inv = paymentSuccessInvoice;
                  const orderId = paymentOrderId;
                      setPaymentSuccessInvoice(null);
                      setPaymentOrderId(null);
                      setAcceptSuccess(null);
                      if (orderId) {
                        navigate(`/${division}/orders/${orderId}`);
                        return;
                      }
                      try {
                        const data = await apiRequest<{ orders: Array<{ _id: string; invoiceNumber?: string }> }>(`/${division}/orders`, {}, division as Division);
                        const order = data.orders.find((o) => o.invoiceNumber === inv.invoiceNumber);
                        if (order) navigate(`/${division}/orders/${order._id}`);
                        else navigate(`/${division}/orders`);
                      } catch {
                        navigate(`/${division}/orders`);
                      }
                    }}
                    className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90"
                  >
                    View order <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Check className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => setAcceptSuccess(null)}
                    className="cursor-pointer w-8 h-8 rounded-lg hover:bg-neutral-bg text-muted hover:text-heading flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-heading">Proposal accepted</h3>
                <p className="text-sm text-muted mt-1">
                  You’ve accepted <span className="font-semibold text-heading">{acceptSuccess!.title}</span> ({acceptSuccess!.proposalCode}).
                </p>
                <p className="text-sm text-body mt-3">Your invoice is now ready. Would you like to continue to payment?</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setAcceptSuccess(null)}
                    className="cursor-pointer px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg"
                  >
                    Maybe later
                  </button>
                  <button
                    onClick={() => {
                      const inv = invoice;
                      if (inv && inv.status === "PENDING") {
                        setAcceptSuccess(null);
                        setShowPayOptions(true);
                      } else {
                        if (invoiceLoading) return;
                        setTimeout(() => {
                          const el = document.getElementById("invoice-section");
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 100);
                        setAcceptSuccess(null);
                      }
                    }}
                    disabled={invoiceLoading || paying}
                    className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90 disabled:opacity-50"
                  >
                    {invoiceLoading || paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Continue to payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
  onShowPayOptions,
  proposalLabels,
  invoiceLabels,
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
  pay: (inv: Invoice, amount?: number) => void;
  onShowPayOptions: () => void;
  proposalLabels: Record<string, string>;
  invoiceLabels: Record<string, string>;
}) {
  const displayStatus = getProposalDisplayStatus(proposal);
  const label = proposalLabels[displayStatus] || displayStatus;
  const cls = PROPOSAL_STATUS_CLS[displayStatus] || "bg-neutral-bg text-muted";
  const Icon = PROPOSAL_STATUS_ICON[displayStatus] || Clock;
  const p = proposal.pricing;

  const showInvoiceSection = proposal.status === "ACCEPTED";
  const hookDivision = (() => { try { return useDivision(); } catch { return "digital" as Division; } })();
  const pdfDivision: Division = hookDivision || (proposal.proposalCode.startsWith("PRP") ? ("digital" as Division) : ("digital" as Division));
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [showPdfFullscreen, setShowPdfFullscreen] = useState(false);
  const [hasViewed, setHasViewed] = useState(() => {
    try { return sessionStorage.getItem(`proposal-viewed-${proposal.proposalCode}`) === "1"; } catch { return false; }
  });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setPdfLoading(true);
    const token = getToken(pdfDivision);
    if (!token) { setPdfLoading(false); return; }
    fetch(`${getApiUrl(pdfDivision)}/${pdfDivision}/proposals/${encodeURIComponent(proposal.proposalCode)}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load PDF");
        return r.blob();
      })
      .then((blob) => {
        if (!active) return;
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(() => {})
      .finally(() => { if (active) setPdfLoading(false); });
    return () => { active = false; };
  }, [proposal.proposalCode, pdfDivision]);

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  useEffect(() => {
    if (hasViewed || proposal.status !== "SENT") return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasViewed(true);
          try { sessionStorage.setItem(`proposal-viewed-${proposal.proposalCode}`, "1"); } catch {}
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasViewed, proposal.status, proposal.proposalCode]);

  const handleDownloadPdf = async () => {
    const token = getToken(pdfDivision);
    if (!token) { toast.error("Not authenticated"); return; }
    setPdfDownloading(true);
    try {
      const res = await fetch(`${getApiUrl(pdfDivision)}/${pdfDivision}/proposals/${encodeURIComponent(proposal.proposalCode)}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${proposal.proposalCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Proposal downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <div id="proposal-detail" className="space-y-6">
          <button onClick={onBack} className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-muted hover:text-heading transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to proposals
      </button>

      <div className="rounded-2xl bg-neutral-surface border border-border p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-heading break-words">{proposal.title}</h2>
            <p className="text-xs text-muted mt-1 break-all">{proposal.proposalCode} · Package {proposal.packageId} · Version {proposal.version}</p>
          </div>
        </div>

        {proposal.description && <p className="text-sm text-body mt-3">{proposal.description}</p>}

        {/* Proposal PDF — server-generated, per-plan template */}
        <div className="mt-5 rounded-2xl border border-border bg-neutral-bg">
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-surface border-b border-border">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted" />
              <span className="text-sm font-semibold text-heading">Proposal PDF</span>
              <span className="text-xs text-muted hidden sm:inline">· {proposal.proposalCode} · 2–3 pages</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => pdfUrl && window.open(pdfUrl, "_blank", "noopener,noreferrer")} disabled={!pdfUrl} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-neutral-surface hover:bg-neutral-bg text-xs font-medium disabled:opacity-30">
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </button>
              <button onClick={handleDownloadPdf} disabled={pdfDownloading} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-neutral-surface hover:bg-neutral-bg text-xs font-medium disabled:opacity-50">
                {pdfDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download
              </button>
              <button onClick={() => setShowPdfFullscreen(true)} disabled={!pdfUrl} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-neutral-surface hover:bg-neutral-bg text-xs font-medium disabled:opacity-30">
                <Maximize className="h-3.5 w-3.5" /> Full screen
              </button>
            </div>
          </div>
          <div className="bg-white">
            {pdfLoading ? (
              <div className="h-[480px] flex items-center justify-center bg-neutral-bg">
                <Loader2 className="h-6 w-6 animate-spin text-muted" />
              </div>
            ) : pdfUrl ? (
              <div className="relative">
                <iframe src={pdfUrl} title={`Proposal ${proposal.proposalCode}`} className="w-full h-[600px] border-0" />
              </div>
            ) : (
              <div className="h-[320px] flex flex-col items-center justify-center p-6 text-center">
                <FileText className="h-8 w-8 text-muted mb-2" />
                <p className="text-sm text-muted">PDF preview unavailable</p>
                <p className="text-xs text-muted mt-1">You can still download the proposal below</p>
              </div>
            )}
          </div>
          {proposal.status === "SENT" && !hasViewed && (
            <div className="px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/20 text-xs text-amber-700 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" /> Scroll to the bottom to unlock acceptance — payment available after you’ve reviewed the full proposal
            </div>
          )}
          {proposal.status === "SENT" && hasViewed && (
            <div className="px-4 py-2.5 bg-emerald-500/10 border-t border-emerald-500/20 text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> You’ve reviewed the proposal — you can now accept below
            </div>
          )}
        </div>



        {proposal.status === "DRAFT" && (
          <div className="mt-5 rounded-xl border border-border bg-neutral-bg p-4 text-sm text-muted">
            This proposal is still being prepared and isn't ready for your response yet. We'll let you know when it's available.
          </div>
        )}

        {proposal.status === "ACCEPTED" && proposal.acceptedAt && (
          <p className="text-xs text-muted mt-3">Accepted on {dateTimeFmt(proposal.acceptedAt)}</p>
        )}

        <div ref={sentinelRef} className="h-1" aria-hidden />
        {proposal.status === "SENT" && (
          <div className="mt-6 border-t border-border pt-5">
            <label className="flex items-start gap-3 cursor-pointer text-sm text-body">
              <input
                type="checkbox"
                checked={agreed}
                onChange={onToggleAgree}
                className="cursor-pointer mt-0.5 accent-[var(--accent)] h-4 w-4"
              />
              <span>I have read and agree to the terms and conditions above.</span>
            </label>
            {!hasViewed && <p className="text-xs text-amber-600 mt-2">Please scroll to the bottom and view the PDF to unlock acceptance.</p>}
            <div className="mt-4 flex justify-end">
              <button
                onClick={onAccept}
                disabled={!agreed || !hasViewed || accepting}
                title={!hasViewed ? "Scroll to review the full proposal first" : undefined}
                className="cursor-pointer px-5 py-2.5 bg-accent text-accent-fg rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {accepting ? "Submitting…" : "Accept proposal"}
              </button>
            </div>
          </div>
        )}

        {showInvoiceSection && (
          <div id="invoice-section" className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Invoice</p>
              {invoice && (() => {
                const invLabel = invoiceLabels[invoice.status] || invoice.status;
                const invCls = INVOICE_STATUS_CLS[invoice.status] || "bg-neutral-bg text-muted";
                const InvStatusIcon = INVOICE_STATUS_ICON[invoice.status] || Clock;
                return (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${invCls}`}>
                    <InvStatusIcon className="h-3.5 w-3.5" /> {invLabel}
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
                      onClick={() => onShowPayOptions()}
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

      {showPdfFullscreen && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black/50">
            <span className="text-sm font-medium text-white">Proposal {proposal.proposalCode}</span>
            <button onClick={() => setShowPdfFullscreen(false)} className="cursor-pointer p-2 rounded-xl hover:bg-white/10 text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe src={pdfUrl} title={`Proposal ${proposal.proposalCode}`} className="w-full h-full border-0" />
          </div>
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