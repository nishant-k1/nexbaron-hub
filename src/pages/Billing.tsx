import { useEffect, useState, useCallback, useRef } from "react";
import { useDivision } from "@/theme/theme-provider";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiRequest, type Division } from "@/lib/api";
import { Receipt } from "lucide-react";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { type BillingView } from "@/lib/billing";

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
  proposalCode?: string;
  planLabel?: string;
  summary?: BillingView;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function Billing() {
  const division = useDivision();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetInvoice = searchParams.get("invoice");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlightedInvoice, setHighlightedInvoice] = useState<string | null>(targetInvoice);
  const invoiceRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const load = useCallback(() => {
    if (!division) return;
    setLoading(true);
    apiRequest<{ invoices: Invoice[] }>(`/${division}/billing/invoices`, {}, division as Division)
      .then((d) => { setInvoices(d.invoices || []); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [division]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (targetInvoice && invoices.some((inv) => inv.invoiceNumber === targetInvoice)) {
      setTimeout(() => {
        const ref = invoiceRefs.current.get(targetInvoice);
        if (ref) {
          ref.scrollIntoView({ behavior: "smooth", block: "center" });
          ref.classList.add("ring-2", "ring-accent", "ring-accent/40");
          setTimeout(() => ref.classList.remove("ring-2", "ring-accent", "ring-accent/40"), 3000);
        }
      }, 100);
    }
  }, [targetInvoice, invoices]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-heading">Billing</h1>
          <p className="text-sm text-muted mt-0.5">Invoices and payments for your account.</p>
        </div>
      </div>

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
              <Skeleton className="h-7 w-24 rounded mt-4" />
              <Skeleton className="h-3 w-32 rounded mt-2" />
            </SkeletonCard>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">{error}</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-heading mb-1">No invoices yet</h3>
          <p className="text-sm text-muted max-w-[320px]">Invoices are created once you accept a proposal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const oneTime = inv.summary?.oneTimeTotal ?? 0;
            const recurring = inv.summary?.recurringTotal ?? 0;
            return (
              <div
                ref={(el) => { if (el) invoiceRefs.current.set(inv.invoiceNumber, el); }}
                key={inv._id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/${division}/billing/${encodeURIComponent(inv.invoiceNumber)}`)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/${division}/billing/${encodeURIComponent(inv.invoiceNumber)}`); }}
                className={`group rounded-2xl bg-neutral-surface border border-border p-4 sm:p-5 hover:border-accent/30 transition-all duration-300 cursor-pointer ${highlightedInvoice === inv.invoiceNumber ? "ring-2 ring-accent/40" : ""}`}
              >
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Receipt className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-heading truncate text-sm">{inv.planLabel || inv.packageId || inv.invoiceNumber}</p>
                      <p className="text-xs text-muted truncate font-mono">
                        {inv.invoiceNumber}
                        {inv.dueDate ? ` · Due ${new Date(inv.dueDate).toLocaleDateString("en-IN")}` : ""}
                        {inv.proposalCode ? ` · ${inv.proposalCode}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-heading">{inr.format(inv.amount)}</p>
                      <p className="text-[11px] text-muted">
                        {oneTime > 0 && recurring > 0
                          ? `${inr.format(oneTime)} setup · ${inr.format(recurring)}/mo`
                          : oneTime > 0
                            ? `${inr.format(oneTime)} one-time`
                            : recurring > 0
                              ? `${inr.format(recurring)}/mo`
                              : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted group-hover:text-accent">→</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
                  <div>
                    <span className="text-base font-bold text-heading">{inr.format(inv.amount)}</span>
                    <p className="text-[11px] text-muted">
                      {oneTime > 0 && recurring > 0
                        ? `${inr.format(oneTime)} setup · ${inr.format(recurring)}/mo`
                        : oneTime > 0
                          ? `${inr.format(oneTime)} one-time`
                          : recurring > 0
                            ? `${inr.format(recurring)}/mo`
                            : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted group-hover:text-accent">→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}