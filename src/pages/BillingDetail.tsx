import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import { Receipt, CheckCircle2, Clock, AlertTriangle, CreditCard, ArrowLeft, Calendar, X, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
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
  return { oneTimeTotal, oneTimePaid, oneTimeDue, recurringTotal, recurringPaid, recurringDue, successfulPayments, oneTimeItems, recurringItems };
}

function InstallmentsListView({ installments, inr }: { installments: Installment[]; inr: Intl.NumberFormat }) {
  return (
    <div className="space-y-3">
      {installments.map((inst, i) => (
        <div key={i} className="rounded-xl bg-neutral-surface border border-border p-4 hover:border-accent/30 transition-colors">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-neutral-bg flex items-center justify-center text-sm font-medium text-heading">#{inst.number}</span>
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted" />
                  <span className="text-sm text-heading">{inst.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-extrabold text-heading text-right min-w-[80px]">{inr.format(inst.amount)}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${inst.status === "paid" ? "bg-emerald-500/15 text-emerald-600" : inst.status === "overdue" ? "bg-red-500/15 text-red-600" : "bg-amber-500/15 text-amber-600"}`}>
                {inst.status === "paid" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {inst.status === "overdue" && <AlertTriangle className="h-3.5 w-3.5" />}
                {inst.status === "due" && <Clock className="h-3.5 w-3.5" />}
                {inst.status === "paid" ? "Paid" : inst.status === "overdue" ? "Overdue" : "Due"}
              </span>
              {inst.status === "paid" && inst.paidAt && <span className="text-xs text-emerald-600 ml-2">Paid {new Date(inst.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentHistoryView({ payments, inr }: { payments: Payment[]; inr: Intl.NumberFormat }) {
  return (
    <div className="mt-4 pt-4 border-t border-border/60">
      <p className="text-xs font-semibold text-muted mb-2">Payment History</p>
      <div className="space-y-1">
        {payments.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).map((p, i) => (
          <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-neutral-bg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-body">{new Date(p.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <span className="text-heading font-medium">{inr.format(p.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OneTimePaymentSection({ summary, inr, hasOneTime }: { summary: ReturnType<typeof computeBillingSummary>; inr: Intl.NumberFormat; hasOneTime: boolean }) {
  if (!hasOneTime) return null;
  let oneTimeContent: React.ReactNode;
  if (summary.oneTimeDue === 0) {
    oneTimeContent = (
      <div className="md:col-span-2 relative p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Fully Paid</span>
        </div>
        <p className="text-3xl font-extrabold text-heading mb-1">{inr.format(summary.oneTimeTotal)}</p>
        <p className="text-xs text-muted">of {inr.format(summary.oneTimeTotal)}</p>
        <div className="mt-3 h-2 bg-emerald-500/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: '100%' }} /></div>
        <div className="absolute top-2 right-2 text-xs text-emerald-500 font-medium">100%</div>
      </div>
    );
  } else {
    oneTimeContent = (
      <>
        <div className="relative p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center"><ArrowUp className="h-4 w-4 text-emerald-600" /></div><span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Paid</span></div>
          <p className="text-3xl font-extrabold text-heading mb-1">{inr.format(summary.oneTimePaid)}</p>
          <p className="text-xs text-muted">of {inr.format(summary.oneTimeTotal)}</p>
          {summary.oneTimeTotal > 0 && <div className="mt-3 h-2 bg-emerald-500/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(summary.oneTimePaid / summary.oneTimeTotal) * 100}%` }} /></div>}
          <div className="absolute top-2 right-2 text-xs text-emerald-500 font-medium">{summary.oneTimeTotal > 0 ? `${Math.round((summary.oneTimePaid / summary.oneTimeTotal) * 100)}%` : '0%'}</div>
        </div>
        <div className="relative p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center"><ArrowDown className="h-4 w-4 text-amber-600" /></div><span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Due</span></div>
          <p className="text-3xl font-extrabold text-heading mb-1">{inr.format(summary.oneTimeDue)}</p>
          <p className="text-xs text-muted">remaining</p>
          {summary.oneTimeTotal > 0 && <div className="mt-3 h-2 bg-amber-500/10 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(summary.oneTimeDue / summary.oneTimeTotal) * 100}%` }} /></div>}
          <div className="absolute top-2 right-2 text-xs text-amber-500 font-medium">{summary.oneTimeTotal > 0 ? `${Math.round((summary.oneTimeDue / summary.oneTimeTotal) * 100)}%` : '0%'}</div>
        </div>
      </>
    );
  }
  return (
    <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CreditCard className="h-5 w-5 text-emerald-600" /></div><div><h3 className="font-semibold text-heading">One-time Payment</h3><p className="text-xs text-muted">Setup fee</p></div></div>
        <div className="text-right"><p className="text-2xl font-extrabold text-heading">{inr.format(summary.oneTimeTotal)}</p><p className="text-xs text-muted">Total</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{oneTimeContent}</div>
    </div>
  );
}

function RecurringPaymentSection({ summary, installments, planMonths, inr, hasRecurring }: { summary: ReturnType<typeof computeBillingSummary>; installments: Installment[]; planMonths: number; inr: Intl.NumberFormat; hasRecurring: boolean }) {
  if (!hasRecurring) return null;
  return (
    <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="h-5 w-5 text-blue-600" /></div><div><h3 className="font-semibold text-heading">Recurring Payment</h3><p className="text-xs text-muted">{planMonths}-month cycle · 28-day billing</p></div></div>
        <div className="flex items-center gap-4 text-right"><div><p className="text-2xl font-extrabold text-heading">{inr.format(summary.recurringTotal)}</p><p className="text-xs text-muted">/ month</p></div>{installments.length > 0 && <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide bg-blue-500/10 px-3 py-1 rounded-full">{installments.filter(i => i.status === "paid").length}/{installments.length} paid</div>}</div>
      </div>
      <InstallmentsListView installments={installments} inr={inr} />
      {summary.successfulPayments.length > 0 && <PaymentHistoryView payments={summary.successfulPayments} inr={inr} />}
    </div>
  );
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/${division}/orders`)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90">
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </button>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">No invoice specified</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-neutral-bg rounded" />
        <div className="rounded-2xl bg-neutral-surface border border-border p-6 h-32" />
        <div className="rounded-2xl bg-neutral-surface border border-border p-6 h-48" />
        <div className="rounded-2xl bg-neutral-surface border border-border p-6 h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">{error}</div>
        <button onClick={() => navigate(`/${division}/billing`)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90">
          <ArrowLeft className="h-4 w-4" /> Back to billing
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="rounded-xl bg-neutral-surface p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-heading mb-1">Invoice not found</h3>
          <p className="text-sm text-muted max-w-[320px]">The requested invoice could not be found.</p>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[invoice.status];
  const Icon = meta.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/${division}/billing`)} className="cursor-pointer p-2 rounded-lg hover:bg-neutral-bg transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-heading">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted mt-0.5">Invoice details — {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{invoice.dueDate ? ` · Due ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}` : ""}</p>
        </div>
        <div className="ml-auto">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </span>
        </div>
      </div>

      {summary && (
        <>
          {hasOneTime && <OneTimePaymentSection summary={summary} inr={inr} hasOneTime={hasOneTime} />}
          {hasRecurring && <RecurringPaymentSection summary={summary} installments={installments} planMonths={planMonths} inr={inr} hasRecurring={hasRecurring} />}
          {!hasOneTime && !hasRecurring && (
            <div className="rounded-2xl bg-neutral-surface border border-border p-6">
              <p className="text-sm text-muted">No line items found for this invoice.</p>
              <p className="text-lg font-bold text-heading mt-2">{inr.format(invoice.amount)}</p>
            </div>
          )}
        </>
      )}

      {invoice.status === "PENDING" && summary && (
        <div className="rounded-2xl bg-neutral-surface border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Amount due</p>
              <p className="text-2xl font-extrabold text-heading">{inr.format(invoice.amount)}</p>
              {summary.oneTimeDue > 0 && summary.recurringDue === 0 && <p className="text-xs text-muted">One-time due {inr.format(summary.oneTimeDue)}</p>}
            </div>
            <button
              onClick={() => setShowPaymentOptions(true)}
              disabled={paying}
              className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" /> {paying ? "Processing…" : "Pay now"}
            </button>
          </div>
          {invoice.paymentSchedule === "FIFTY_FIFTY" && <p className="text-xs text-muted mt-2">This invoice supports 50% advance — you’ll be offered Full or 50% options.</p>}
        </div>
      )}

      {(showPaymentOptions || paymentSuccess) && summary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            if (paying) return;
            setShowPaymentOptions(false);
            setPaymentSuccess(false);
          }}
        >
          <div className="bg-neutral-surface rounded-2xl w-full max-w-md shadow-2xl p-6 transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            {paymentSuccess ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <button onClick={() => { setPaymentSuccess(false); setShowPaymentOptions(false); }} className="cursor-pointer w-8 h-8 rounded-lg hover:bg-neutral-bg text-muted hover:text-heading flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-heading animate-in fade-in slide-in-from-bottom-1 duration-300">Payment confirmed</h3>
                <p className="text-sm text-muted mt-1 animate-in fade-in duration-300">Your payment for <span className="font-mono font-medium text-heading">{invoice.invoiceNumber}</span> was successful.</p>
                <p className="text-sm text-body mt-3 animate-in fade-in duration-300 delay-100">Would you like to view your order details now?</p>
                <div className="mt-6 flex justify-end gap-3 animate-in fade-in duration-300 delay-150">
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
                  <h3 className="text-lg font-bold text-heading">Choose Payment Amount</h3>
                  <button onClick={() => setShowPaymentOptions(false)} disabled={paying} className="cursor-pointer text-muted hover:text-heading disabled:opacity-50"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-muted mb-4">
                  This invoice is <span className="font-mono font-medium text-heading">{invoice.paymentSchedule}</span> from the API ({inr.format(invoice.amount)} total). {invoice.paymentSchedule === "FIFTY_FIFTY" ? "You can pay the 50% advance now or the full amount." : "Pay the full amount to complete your order."}
                </p>
                <div className="rounded-xl bg-neutral-bg border border-border p-3 mb-4 text-xs">
                  <div className="flex justify-between"><span className="text-muted">One-time paid</span><span className="font-medium text-heading">{inr.format(summary.oneTimePaid)} / {inr.format(summary.oneTimeTotal || invoice.amount)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-muted">Due now</span><span className="font-bold text-heading">{inr.format(summary.oneTimeDue || invoice.amount)}</span></div>
                </div>
                <div className="space-y-3">
                  {invoice.paymentSchedule === "FIFTY_FIFTY" && (
                    <button
                      onClick={() => pay(invoice, Math.round(invoice.amount / 2))}
                      disabled={paying}
                      className="cursor-pointer w-full p-4 rounded-xl border border-border bg-neutral-bg hover:border-accent/30 transition-colors flex items-center justify-between disabled:opacity-50"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-heading">Pay 50% Advance</p>
                        <p className="text-xs text-muted">{inr.format(Math.round(invoice.amount / 2))} now, balance {inr.format(invoice.amount - Math.round(invoice.amount / 2))} later</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-accent" />
                    </button>
                  )}
                  <button
                    onClick={() => pay(invoice, invoice.amount)}
                    disabled={paying}
                    className="cursor-pointer w-full p-4 rounded-xl bg-accent text-accent-fg hover:opacity-90 transition-opacity flex items-center justify-between disabled:opacity-50"
                  >
                    <div className="text-left">
                      <p className="font-semibold">Pay Full Amount</p>
                      <p className="text-xs text-accent-fg/70">{inr.format(invoice.amount)} upfront</p>
                    </div>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                <button onClick={() => setShowPaymentOptions(false)} disabled={paying} className="cursor-pointer w-full mt-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg transition-colors disabled:opacity-50">Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
