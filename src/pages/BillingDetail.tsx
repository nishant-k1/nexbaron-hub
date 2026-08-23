import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import { Receipt, CheckCircle2, Clock, AlertTriangle, CreditCard, ArrowLeft, Calendar, X, ArrowRight } from "lucide-react";

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

export default function BillingDetail() {
  const division = useDivision();
  const navigate = useNavigate();
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const decodedInvoiceNumber = invoiceNumber ? decodeURIComponent(invoiceNumber) : "";
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [keyId, setKeyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState("");
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const load = useCallback(() => {
    if (!division || !decodedInvoiceNumber) return;
    setLoading(true);
    apiRequest<{ invoice: Invoice; razorpayKeyId?: string }>(`/${division}/billing/invoices/${decodedInvoiceNumber}`, {}, division as Division)
      .then((d) => {
        setInvoice(d.invoice);
        setKeyId(d.razorpayKeyId ?? "");
        setError("");
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
        const { order } = await apiRequest<{ success: boolean; order: { id: string; amount: number } }>(
          `/${division}/billing/invoices/${inv.invoiceNumber}/pay`,
          { method: "POST", body: JSON.stringify({ amount }) },
          division as Division
        );
        const Razorpay = await loadRazorpay();
        const rzp = new Razorpay({
          key: keyId,
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
            load();
          },
          modal: { ondismiss: () => setPaying(false) },
        });
        rzp.open();
      } else {
        await apiRequest(`/${division}/billing/payments/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceNumber: inv.invoiceNumber, amount }),
        }, division as Division);
        setToast("Payment marked as paid (dev mode).");
        load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

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
      {toast && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">{toast}</div>}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/${division}/billing`)} className="cursor-pointer p-2 rounded-lg hover:bg-neutral-bg transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-heading">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted mt-0.5">Invoice details</p>
        </div>
        <div className="ml-auto">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-surface border border-border p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="font-semibold text-heading">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted">
              {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {invoice.dueDate ? ` · Due ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}` : ""}
            </p>
          </div>
          <span className="text-xl font-extrabold text-heading">{inr.format(invoice.amount)}</span>
        </div>
        {invoice.lineItems.length > 0 && (
          <ul className="divide-y divide-border/60">
            {invoice.lineItems.map((li, i) => (
              <li key={i} className="flex justify-between text-sm py-2">
                <span className="text-body">{li.label}</span>
                <span className="text-heading font-medium">{inr.format(li.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        {invoice.status === "PENDING" && (
          <button
            onClick={() => {
              const isFifty = invoice.paymentSchedule === "FIFTY_FIFTY";
              if (isFifty) { setShowPaymentOptions(true); return; }
              pay(invoice);
            }}
            disabled={paying}
            className="cursor-pointer mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" /> {paying ? "Processing…" : "Pay Now"}
          </button>
        )}
      </div>

      {showPaymentOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPaymentOptions(false)}>
          <div className="bg-neutral-surface rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">Choose Payment Amount</h3>
              <button onClick={() => setShowPaymentOptions(false)} className="cursor-pointer text-muted hover:text-heading"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted mb-4">This invoice has a 50/50 payment schedule. You can pay the 50% advance now and the balance later, or pay the full amount upfront.</p>
            <div className="space-y-3">
              <button
                onClick={() => { pay(invoice, Math.round(invoice.amount / 2)); setShowPaymentOptions(false); }}
                disabled={paying}
                className="cursor-pointer w-full p-4 rounded-xl border border-border bg-neutral-bg hover:border-accent/30 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-heading">Pay 50% Advance</p>
                  <p className="text-xs text-muted">{inr.format(Math.round(invoice.amount / 2))} now, balance later</p>
                </div>
                <ArrowRight className="h-5 w-5 text-accent" />
              </button>
              <button
                onClick={() => { pay(invoice, invoice.amount); setShowPaymentOptions(false); }}
                disabled={paying}
                className="cursor-pointer w-full p-4 rounded-xl bg-accent text-accent-fg hover:opacity-90 transition-opacity flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">Pay Full Amount</p>
                  <p className="text-xs text-accent-fg/70">{inr.format(invoice.amount)} upfront</p>
                </div>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            <button onClick={() => setShowPaymentOptions(false)} className="cursor-pointer w-full mt-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
