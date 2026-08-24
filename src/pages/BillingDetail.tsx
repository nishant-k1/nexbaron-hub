import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import { Receipt, CheckCircle2, Clock, AlertTriangle, CreditCard, ArrowLeft, Calendar, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window { Razorpay: any }
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
  packageId?: string;
  paymentSchedule?: "FULL_UPFRONT" | "FIFTY_FIFTY";
}

interface Installment {
  number: number;
  dueDate: Date;
  amount: number;
  status: "paid" | "due" | "overdue";
  paidAt?: string;
}

interface PlanCatalog {
  id: string;
  name: string;
  minimumMonths?: number;
  pricing?: { setup: number; monthly: number; annual?: number; minimumMonths?: number };
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STATUS_META: Record<Invoice["status"], { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: "Draft", cls: "bg-neutral-bg text-muted", icon: Clock },
  PENDING: { label: "Pending", cls: "bg-amber-500/15 text-amber-600", icon: Clock },
  PAID: { label: "Paid", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  FAILED: { label: "Failed", cls: "bg-red-500/15 text-red-600", icon: AlertTriangle },
  CANCELLED: { label: "Cancelled", cls: "bg-neutral-bg text-muted", icon: AlertTriangle },
};

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

function computeInstallments(inv: Invoice, planMonths: number): Installment[] {
  const recurringItems = inv.lineItems.filter((li) => li.type === "RECURRING");
  if (recurringItems.length === 0) return [];
  const recurringTotal = recurringItems.reduce((sum, li) => sum + li.amount, 0);
  const successfulPayments = inv.payments.filter((p) => p.status === "SUCCESS");
  const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const oneTimeTotal = inv.lineItems.filter((li) => li.type === "ONE_TIME").reduce((sum, li) => sum + li.amount, 0);
  const recurringPaid = Math.max(0, totalPaid - oneTimeTotal);
  const isAnnual = recurringItems.some((li) => li.label.toLowerCase().includes("annual") || li.label.toLowerCase().includes("year"));
  const cycleDays = isAnnual ? 365 : 28;
  const installmentAmount = recurringTotal;
  const numInstallments = isAnnual ? 1 : planMonths;
  const installments: Installment[] = [];
  const invoiceDate = new Date(inv.createdAt);
  for (let i = 0; i < numInstallments; i++) {
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + (i + 1) * cycleDays);
    const installmentPaidAmount = Math.min(recurringPaid, installmentAmount * (i + 1)) - Math.min(recurringPaid, installmentAmount * i);
    const isPaid = installmentPaidAmount >= installmentAmount * 0.9;
    const isOverdue = !isPaid && dueDate < new Date();
    let paidAt: string | undefined;
    if (isPaid) {
      const relevantPayment = successfulPayments.filter(p => new Date(p.at) <= dueDate).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
      if (relevantPayment) paidAt = relevantPayment.at;
    }
    installments.push({ number: i + 1, dueDate, amount: installmentAmount, status: isPaid ? "paid" : isOverdue ? "overdue" : "due", paidAt });
  }
  return installments;
}

function computeBillingSummary(inv: Invoice) {
  const oneTimeItems = inv.lineItems.filter((li) => li.type === "ONE_TIME");
  const recurringItems = inv.lineItems.filter((li) => li.type === "RECURRING");
  const oneTimeTotal = oneTimeItems.reduce((sum, li) => sum + li.amount, 0);
  const recurringTotal = recurringItems.reduce((sum, li) => sum + li.amount, 0);
  const successfulPayments = inv.payments.filter((p) => p.status === "SUCCESS");
  const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const oneTimePaid = Math.min(totalPaid, oneTimeTotal);
  const oneTimeDue = Math.max(0, oneTimeTotal - oneTimePaid);
  const recurringPaid = Math.max(0, totalPaid - oneTimeTotal);
  const recurringDue = Math.max(0, recurringTotal - recurringPaid);
  return { oneTimeTotal, oneTimePaid, oneTimeDue, recurringTotal, recurringPaid, recurringDue, successfulPayments, oneTimeItems, recurringItems, totalPaid };
}

export default function BillingDetail() {
  const division = useDivision();
  const navigate = useNavigate();
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const decodedInvoiceNumber = invoiceNumber ? decodeURIComponent(invoiceNumber) : "";
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [plan, setPlan] = useState<PlanCatalog | null>(null);
  const [keyId, setKeyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const load = useCallback(() => {
    if (!division || !decodedInvoiceNumber) return;
    setLoading(true);
    apiRequest<{ invoice: Invoice; razorpayKeyId?: string }>(`/${division}/billing/invoices/${decodedInvoiceNumber}`, {}, division as Division)
      .then(async (d) => {
        setInvoice(d.invoice);
        setKeyId(d.razorpayKeyId ?? "");
        setError("");
        if (d.invoice.packageId) {
          try {
            const planData = await apiRequest<{ plan: PlanCatalog }>(`/${division}/catalog/plans/${d.invoice.packageId}`, {}, division as Division);
            setPlan(planData.plan);
          } catch {}
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [division, decodedInvoiceNumber]);

  useEffect(() => { load(); }, [load]);

  const pay = async (inv: Invoice, amount?: number) => {
    if (!division) return;
    setPaying(true);
    setError("");
    try {
      if (keyId) {
        const { order } = await apiRequest<{ success: boolean; order: { id: string; amount: number } }>(`/${division}/billing/invoices/${inv.invoiceNumber}/pay`, { method: "POST", body: JSON.stringify({ amount }) }, division as Division);
        const Razorpay = await loadRazorpay();
        const rzp = new Razorpay({
          key: keyId,
          amount: order.amount,
          currency: inv.currency || "INR",
          name: "Nexbaron",
          description: inv.invoiceNumber,
          order_id: order.id,
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            await apiRequest(`/${division}/billing/payments/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...response, invoiceNumber: inv.invoiceNumber, amount: amount ?? inv.amount }) }, division as Division);
            load();
            setPaymentSuccess(true);
          },
          modal: { ondismiss: () => setPaying(false) },
        });
        rzp.open();
      } else {
        await apiRequest(`/${division}/billing/payments/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceNumber: inv.invoiceNumber, amount }) }, division as Division);
        load();
        setPaymentSuccess(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed", { duration: 4000 });
    } finally {
      setPaying(false);
    }
  };

  const summary = invoice ? computeBillingSummary(invoice) : null;
  const planMonths = plan?.minimumMonths ?? plan?.pricing?.minimumMonths ?? 12;
  const installments = invoice ? computeInstallments(invoice, planMonths) : [];
  const hasOneTime = !!summary && summary.oneTimeTotal > 0;
  const hasRecurring = !!summary && summary.recurringTotal > 0;

  if (!decodedInvoiceNumber) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => navigate(`/${division}/orders`)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </button>
        <div className="rounded-2xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">No invoice specified</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-neutral-bg rounded" />
        <div className="rounded-2xl bg-neutral-surface border border-border p-6 h-28" />
        <div className="rounded-2xl bg-neutral-surface border border-border p-6 h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">{error}</div>
        <button onClick={() => navigate(`/${division}/billing`)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90">
          <ArrowLeft className="h-4 w-4" /> Back to billing
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-bg text-muted flex items-center justify-center mb-4">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-heading">Invoice not found</h3>
          <p className="text-sm text-muted mt-1 max-w-[320px]">The requested invoice could not be found.</p>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[invoice.status];
  const Icon = meta.icon;
  const totalPaid = summary?.totalPaid ?? 0;
  const amountDue = Math.max(0, invoice.amount - totalPaid);
  const paidPercent = invoice.amount > 0 ? Math.min(100, Math.round((totalPaid / invoice.amount) * 100)) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(`/${division}/billing`)} className="cursor-pointer mt-1 p-2 rounded-xl hover:bg-neutral-bg transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-heading font-mono">{invoice.invoiceNumber}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
              <Icon className="h-3.5 w-3.5" /> {meta.label}
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            {invoice.dueDate ? ` · Due ${new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            {invoice.paymentSchedule ? ` · ${invoice.paymentSchedule === "FIFTY_FIFTY" ? "50/50" : "Full upfront"}` : ""}
          </p>
        </div>
        {invoice.status === "PENDING" && amountDue > 0 && (
          <button
            onClick={() => setShowPaymentOptions(true)}
            disabled={paying}
            className="hidden sm:inline-flex cursor-pointer items-center gap-2 px-5 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            <CreditCard className="h-4 w-4" /> {paying ? "Processing…" : "Pay now"}
          </button>
        )}
      </div>

      {/* Invoice overview — single source for totals */}
      <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted">Total amount</p>
              <p className="text-3xl font-bold tracking-tight text-heading mt-1">{inr.format(invoice.amount)}</p>
              <p className="text-sm text-muted mt-1">
                {totalPaid > 0 ? (
                  <span><span className="text-emerald-600 font-medium">{inr.format(totalPaid)} paid</span> · {amountDue > 0 ? `${inr.format(amountDue)} due` : "Fully paid"}</span>
                ) : (
                  <span>Due on {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "request"}</span>
                )}
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs text-muted">Status</p>
              <p className="text-sm font-medium text-heading mt-1">{meta.label}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="h-1.5 bg-neutral-bg rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${paidPercent}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-muted">{paidPercent}% paid</span>
              {invoice.paymentSchedule === "FIFTY_FIFTY" && <span className="text-xs text-muted">50/50 schedule</span>}
            </div>
          </div>
        </div>
        {/* Breakdown — grouped, no duplicate total */}
        <div className="border-t border-border divide-y divide-border/60">
          {summary && summary.oneTimeItems.length > 0 && (
            <div className="px-6 py-3 flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5 text-muted" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">One-time</span>
              <span className="text-xs text-muted">· {summary.oneTimeItems.length} item{summary.oneTimeItems.length > 1 ? "s" : ""}</span>
              <span className="ml-auto text-xs font-medium text-heading">{inr.format(summary.oneTimeTotal)}</span>
            </div>
          )}
          {summary?.oneTimeItems.map((li, i) => (
            <div key={`ot-${i}`} className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-neutral-bg/40 transition-colors">
              <p className="text-sm text-heading truncate">{li.label}</p>
              <p className="text-sm font-medium text-heading shrink-0">{inr.format(li.amount)}</p>
            </div>
          ))}
          {summary && summary.recurringItems.length > 0 && (
            <div className="px-6 py-3 flex items-center gap-2 bg-neutral-bg/20 border-y border-border/60">
              <Calendar className="h-3.5 w-3.5 text-muted" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">Recurring</span>
              <span className="text-xs text-muted">· {inr.format(summary.recurringTotal)}/mo</span>
              <span className="ml-auto text-xs font-medium text-heading">{inr.format(summary.recurringTotal)}/mo</span>
            </div>
          )}
          {summary?.recurringItems.map((li, i) => (
            <div key={`rc-${i}`} className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-neutral-bg/40 transition-colors">
              <p className="text-sm text-heading truncate">{li.label}</p>
              <p className="text-sm font-medium text-heading shrink-0">{inr.format(li.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* One-time — separate card, history only, no duplicate big total */}
      {hasOneTime && summary && (
        <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5" /> One-time · Setup
            </h3>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${summary.oneTimeDue === 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
              {summary.oneTimeDue === 0 ? "Fully paid" : `${inr.format(summary.oneTimeDue)} due`}
            </span>
          </div>
          <div className="px-6 pb-4 flex items-center justify-between text-sm">
            <span className="text-muted">{summary.oneTimeItems.map(li => li.label).join(", ") || "Setup fee"}</span>
            <span className="font-medium text-heading">{inr.format(summary.oneTimeTotal)}</span>
          </div>
          <div className="mx-6 h-px bg-border/60" />
          <div className="px-6 py-3 flex items-center justify-between text-xs">
            <span className="text-muted">{summary.oneTimeDue === 0 ? "Paid in full" : `${inr.format(summary.oneTimePaid)} of ${inr.format(summary.oneTimeTotal)} paid`}</span>
            <span className="text-muted">{summary.oneTimeDue === 0 ? "100%" : `${Math.round((summary.oneTimePaid / summary.oneTimeTotal) * 100)}%`}</span>
          </div>
        </div>
      )}

      {/* Recurring — separate card, schedule only */}
      {hasRecurring && summary && (
        <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Recurring
            </h3>
            <span className="text-xs font-medium text-heading">{inr.format(summary.recurringTotal)}/mo · {planMonths} mo</span>
          </div>
          <div className="px-6 pb-3 flex items-center justify-between">
            <p className="text-sm text-muted">{installments.filter(i=>i.status==="paid").length} of {installments.length || planMonths} installments paid</p>
            <p className="text-xs text-muted">{summary.recurringDue > 0 ? `${inr.format(summary.recurringDue)} remaining` : "All paid"}</p>
          </div>
          {installments.length > 0 && (
            <div className="border-t border-border divide-y divide-border/60">
              {installments.map((inst) => (
                <div key={inst.number} className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-neutral-bg/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted w-7">#{String(inst.number).padStart(2,"0")}</span>
                    <span className="text-sm text-heading">{inst.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {inst.status === "paid" && inst.paidAt && <span className="hidden sm:inline text-xs text-emerald-600">· Paid {new Date(inst.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${inst.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : inst.status === "overdue" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {inst.status === "paid" ? "Paid" : inst.status === "overdue" ? "Overdue" : "Due"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payments history — separate card */}
      {summary && summary.successfulPayments.length > 0 && (
        <div className="rounded-2xl bg-neutral-surface border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Payment history</h3>
          </div>
          <div className="divide-y divide-border/60">
            {summary.successfulPayments.sort((a,b)=> new Date(b.at).getTime()-new Date(a.at).getTime()).map((p, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-neutral-bg/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></div>
                  <span className="text-sm text-heading">{new Date(p.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="text-xs text-muted hidden sm:inline">{new Date(p.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <span className="text-sm font-semibold text-heading">{inr.format(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile pay CTA — minimal, not a card-in-card */}
      {invoice.status === "PENDING" && amountDue > 0 && (
        <div className="sm:hidden">
          <button
            onClick={() => setShowPaymentOptions(true)}
            disabled={paying}
            className="w-full cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-accent text-accent-fg font-semibold text-sm rounded-2xl hover:opacity-90 disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" /> {paying ? "Processing…" : `Pay ${inr.format(amountDue)}`}
          </button>
          {invoice.paymentSchedule === "FIFTY_FIFTY" && <p className="text-xs text-muted text-center mt-2">50% advance available</p>}
        </div>
      )}

      {/* Payment options modal — kept but minimal */}
      {(showPaymentOptions || paymentSuccess) && summary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            if (paying) return;
            setShowPaymentOptions(false);
            setPaymentSuccess(false);
          }}
        >
          <div className="bg-neutral-surface rounded-2xl w-full max-w-md border border-border shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            {paymentSuccess ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <button onClick={() => { setPaymentSuccess(false); setShowPaymentOptions(false); }} className="cursor-pointer w-8 h-8 rounded-xl hover:bg-neutral-bg text-muted hover:text-heading flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-heading">Payment confirmed</h3>
                <p className="text-sm text-muted mt-1">Your payment for <span className="font-mono font-medium text-heading">{invoice.invoiceNumber}</span> was successful.</p>
                <p className="text-sm text-body mt-3">View your order details now?</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => { setPaymentSuccess(false); setShowPaymentOptions(false); }} className="cursor-pointer px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg">Stay here</button>
                  <button
                    onClick={async () => {
                      setPaymentSuccess(false);
                      setShowPaymentOptions(false);
                      try {
                        const data = await apiRequest<{ orders: Array<{ _id: string; invoiceNumber?: string }> }>(`/${division}/orders`, {}, division as Division);
                        const order = data.orders.find((o) => o.invoiceNumber === invoice.invoiceNumber);
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
                  <h3 className="text-base font-semibold text-heading">Choose amount</h3>
                  <button onClick={() => setShowPaymentOptions(false)} disabled={paying} className="cursor-pointer p-1.5 rounded-xl hover:bg-neutral-bg text-muted hover:text-heading disabled:opacity-50"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-muted mb-4">
                  {invoice.paymentSchedule === "FIFTY_FIFTY" ? "Pay 50% now or the full amount." : "Pay the full amount to complete."} Total {inr.format(invoice.amount)}.
                </p>
                <div className="rounded-xl bg-neutral-bg border border-border divide-y divide-border/60 mb-4 overflow-hidden">
                  <div className="flex justify-between px-4 py-2.5"><span className="text-xs text-muted">Paid</span><span className="text-sm font-medium text-heading">{inr.format(summary.totalPaid)}</span></div>
                  <div className="flex justify-between px-4 py-2.5"><span className="text-xs text-muted">Due</span><span className="text-sm font-bold text-heading">{inr.format(amountDue)}</span></div>
                </div>
                <div className="space-y-3">
                  {invoice.paymentSchedule === "FIFTY_FIFTY" && (
                    <button
                      onClick={() => pay(invoice, Math.round(invoice.amount / 2))}
                      disabled={paying}
                      className="cursor-pointer w-full p-4 rounded-2xl border border-border bg-neutral-bg hover:border-accent/30 transition-colors flex items-center justify-between disabled:opacity-50 text-left"
                    >
                      <div>
                        <p className="font-medium text-heading text-sm">Pay 50% advance</p>
                        <p className="text-xs text-muted mt-0.5">{inr.format(Math.round(invoice.amount / 2))} now</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted" />
                    </button>
                  )}
                  <button
                    onClick={() => pay(invoice, invoice.amount)}
                    disabled={paying}
                    className="cursor-pointer w-full p-4 rounded-2xl bg-accent text-accent-fg hover:opacity-90 transition-opacity flex items-center justify-between disabled:opacity-50 text-left"
                  >
                    <div>
                      <p className="font-semibold text-sm">Pay full amount</p>
                      <p className="text-xs text-accent-fg/70 mt-0.5">{inr.format(invoice.amount)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                <button onClick={() => setShowPaymentOptions(false)} disabled={paying} className="cursor-pointer w-full mt-3 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg transition-colors disabled:opacity-50">Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
