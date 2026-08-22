import { useEffect, useState, useCallback } from "react";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import { Receipt, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

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
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

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

export default function Billing() {
  const division = useDivision();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [keyId, setKeyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    if (!division) return;
    setLoading(true);
    apiRequest<{ invoices: Invoice[]; razorpayKeyId?: string }>(`/${division}/billing/invoices`, {}, division as Division)
      .then((d) => { setInvoices(d.invoices || []); setKeyId(d.razorpayKeyId ?? ""); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [division]);

  useEffect(() => { load(); }, [load]);

  const pay = async (inv: Invoice) => {
    if (!division) return;
    setPaying(inv.invoiceNumber);
    setError("");
    try {
      if (keyId) {
        const { order } = await apiRequest<{ success: boolean; order: { id: string; amount: number } }>(
          `/${division}/billing/invoices/${inv.invoiceNumber}/pay`, { method: "POST" }, division as Division
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
          modal: {
            ondismiss: () => setPaying(null),
          },
        });
        rzp.open();
      } else {
        // Dev mode: no live keys configured — settle directly.
        await apiRequest(`/${division}/billing/payments/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceNumber: inv.invoiceNumber }),
        }, division as Division);
        setToast("Payment marked as paid (dev mode).");
        load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Billing</h1>
        <p className="text-sm text-muted mt-0.5">Invoices and payments for your account.</p>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">{toast}</div>
      )}

      {loading ? (
        <div className="text-sm text-muted">Loading invoices…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">{error}</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl bg-neutral-surface p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-heading mb-1">No invoices yet</h3>
          <p className="text-sm text-muted max-w-[320px]">Invoices are created once you accept a proposal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const meta = STATUS_META[inv.status];
            const Icon = meta.icon;
            return (
              <div key={inv._id} className="rounded-2xl bg-neutral-surface border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-heading">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted">
                      {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {inv.dueDate ? ` · Due ${new Date(inv.dueDate).toLocaleDateString("en-IN")}` : ""}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </span>
                </div>

                {inv.lineItems.length > 0 && (
                  <ul className="mt-3 divide-y divide-border/60">
                    {inv.lineItems.map((li, i) => (
                      <li key={i} className="flex justify-between text-sm py-1.5">
                        <span className="text-body">{li.label}</span>
                        <span className="text-heading font-medium">{inr.format(li.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-heading">{inr.format(inv.amount)}</span>
                  {inv.status === "PENDING" && (
                    <button
                      onClick={() => pay(inv)}
                      disabled={paying === inv.invoiceNumber}
                      className="cursor-pointer px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {paying === inv.invoiceNumber ? "Processing…" : "Pay now"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
