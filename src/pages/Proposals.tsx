import { useEffect, useState, useCallback } from "react";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, ApiError, type Division } from "@/lib/api";
import { FileText, CheckCircle2, Clock, ChevronLeft, Check } from "lucide-react";

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

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFmt = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dateTimeFmt = (s?: string) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const SCHEDULE_LABELS: Record<string, string> = { FULL_UPFRONT: "Full upfront", FIFTY_FIFTY: "50 / 50" };
const FREQUENCY_LABELS: Record<string, string> = { MONTHLY: "Monthly", ANNUAL: "Annual" };

const STATUS_META: Record<Proposal["status"], { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: "Draft", cls: "bg-neutral-bg text-muted", icon: Clock },
  SENT: { label: "Awaiting your response", cls: "bg-amber-500/15 text-amber-600", icon: Clock },
  ACCEPTED: { label: "Accepted", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
};

function friendlyAcceptError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session has expired. Please sign in again.";
    if (err.status === 403) return "This proposal isn't available for you to accept.";
    if (err.status === 400) return "This proposal isn't ready to be accepted yet.";
  }
  return "We couldn't submit your response. Please try again in a moment.";
}

export default function Proposals() {
  const division = useDivision();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [selected, setSelected] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(() => {
    if (!division) return;
    setLoading(true);
    apiRequest<{ proposals: Proposal[] }>(`/${division}/proposals`, {}, division as Division)
      .then((d) => { setProposals(d.proposals || []); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load proposals"))
      .finally(() => setLoading(false));
  }, [division]);

  useEffect(() => { setSelected(null); setAgreed(false); setToast(""); load(); }, [load]);

  const selectedProposal = proposals.find((p) => p.proposalCode === selected) || null;

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Proposals</h1>
        <p className="text-sm text-muted mt-0.5">Review the plans we've prepared for you and accept the ones you're happy with.</p>
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
            <div className="text-sm text-muted">Loading proposals…</div>
          ) : proposals.length === 0 ? (
            <div className="rounded-2xl bg-neutral-surface p-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-heading mb-1">No proposals yet</h3>
              <p className="text-sm text-muted max-w-[320px]">When we send you a proposal, it will appear here for your review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((p) => {
                const meta = STATUS_META[p.status];
                const Icon = meta.icon;
                return (
                  <button
                    key={p._id}
                    onClick={() => { setSelected(p.proposalCode); setAgreed(false); }}
                    className="cursor-pointer w-full text-left rounded-2xl bg-neutral-surface border border-border p-5 hover:border-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-heading">{p.title}</p>
                        <p className="text-xs text-muted mt-0.5">{p.proposalCode} · Package {p.packageId}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
                        <Icon className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                      <span>Version {p.version}</span>
                      <span>Created {dateFmt(p.createdAt)}</span>
                      <span>Updated {dateFmt(p.updatedAt)}</span>
                      {p.pricing.oneTimeFee != null && p.pricing.oneTimeEnabled && <span>Setup {inr.format(p.pricing.oneTimeFee)}</span>}
                      {p.pricing.recurringFee != null && p.pricing.recurringEnabled && (
                        <span>Recurring {inr.format(p.pricing.recurringFee)} / {FREQUENCY_LABELS[p.pricing.recurringFrequency || ""] || p.pricing.recurringFrequency}</span>
                      )}
                    </div>
                  </button>
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
}: {
  proposal: Proposal;
  agreed: boolean;
  accepting: boolean;
  onToggleAgree: () => void;
  onAccept: () => void;
  onBack: () => void;
}) {
  const meta = STATUS_META[proposal.status];
  const Icon = meta.icon;
  const p = proposal.pricing;

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
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2">Terms &amp; conditions</p>
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
      </div>
    </div>
  );
}
