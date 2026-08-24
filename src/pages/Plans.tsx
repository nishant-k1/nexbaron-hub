import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, chatApiRequest, type Division } from "@/lib/api";
import { cn } from "@/lib/cn";
import { BillingToggle } from "@/components/ui/BillingToggle";
import { Skeleton, SkeletonCard, SkeletonList } from "@/components/ui/Skeleton";
import {
  Check,
  Building2,
  Globe,
  Rocket,
  TrendingUp,
  MessageSquare,
  Package as PackageIcon,
  ArrowRight,
  Loader2,
  X,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

interface CatalogService {
  id?: string;
  label: string;
  scope?: string;
  description?: string;
}

interface CatalogPlan {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  featured?: boolean;
  custom?: boolean;
  pricing?: { setup: number; monthly: number; annual?: number; minimumMonths?: number };
  services: CatalogService[];
  ctaLabel: string;
}

interface AccountPkg {
  _id: string;
  packageCode: string;
  name: string;
  type: "STANDARD" | "CUSTOM";
  visibility?: "DRAFT" | "LIVE";
  description?: string;
  deliveryStatus: "ANALYSIS" | "IN_PROGRESS" | "REVIEW" | "DELIVERED";
  oneTimeEnabled?: boolean;
  oneTimeFee?: number;
  recurringEnabled?: boolean;
  recurringFee?: number;
  recurringFrequency?: "MONTHLY" | "ANNUAL";
  services: { serviceCode: string; name: string }[];
}

interface Account {
  accountCode: string;
  name: string;
}

const PLAN_ICONS: Record<string, LucideIcon> = {
  Building2,
  Globe,
  Rocket,
  TrendingUp,
  MessageSquare,
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function Plans() {
  const division = useDivision();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlanId = searchParams.get("plan");
  const initialBilling: "monthly" | "annual" = searchParams.get("billing") === "annual" ? "annual" : "monthly";

  const [billing, setBilling] = useState<"monthly" | "annual">(initialBilling);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const [accountPkgs, setAccountPkgs] = useState<AccountPkg[]>([]);
  const [account, setAccount] = useState<Account | null>(null);

  const [activePlan, setActivePlan] = useState<string | null>(selectedPlanId);
  const [creating, setCreating] = useState(false);
  const [customNotice, setCustomNotice] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<CatalogPlan | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingCatalog(true);
    apiRequest<{ plans: CatalogPlan[] }>(`/${division}/catalog`, {}, division as Division)
      .then((d) => {
        if (!active) return;
        setPlans(d.plans || []);
        setLoadingCatalog(false);
      })
      .catch((e) => {
        if (!active) return;
        setCatalogError(e instanceof Error ? e.message : "Failed to load plans");
        setLoadingCatalog(false);
      });
    return () => {
      active = false;
    };
  }, [division]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ packages: AccountPkg[] }>(`/${division}/packages`, {}, division as Division),
      apiRequest<{ account: Account | null }>(`/${division}/account`, {}, division as Division),
    ])
      .then(([p, a]) => {
        if (!active) return;
        setAccountPkgs(p.packages || []);
        setAccount(a.account ?? null);
      })
      .catch((e) => {
        if (!active) return;
        console.error("Failed to load packages/account:", e);
      });
    return () => {
      active = false;
    };
  }, [division]);

  const customPkg = accountPkgs.find((p) => p.type === "CUSTOM");
  const selectedId = activePlan ?? customPkg?.packageCode ?? selectedPlanId;
  const cycleSuffix = billing === "annual" ? "/yr" : "/mo";

  const handleChoose = async (plan: CatalogPlan) => {
    setActivePlan(plan.id);
    if (plan.custom || plan.id === "custom") {
      const msg =
        "I've some custom services requirement please create me a plan for that";
      setCustomNotice(msg);
      chatApiRequest(
        `/${division}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, template: "custom-plan-request" }),
        },
        division as Division
      ).catch(() => {});
      return;
    }
    setConfirmPlan(plan);
  };

  const confirmRequest = async () => {
    if (!confirmPlan) return;
    setCreating(true);
    try {
      const res = await apiRequest<{ proposal: { proposalCode: string } }>(
        `/${division}/proposals/from-plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: confirmPlan.id, billingCycle: billing }),
        },
        division as Division
      );
      const code = res.proposal?.proposalCode;
      setConfirmPlan(null);
      if (code) navigate(`/${division}/proposals?proposal=${encodeURIComponent(code)}`);
      else navigate(`/${division}/proposals`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create your proposal. Please try again.", { duration: 4000 });
    } finally {
      setCreating(false);
    }
  };

  const handleRequestFromPackage = async (pkg: AccountPkg) => {
    setActivePlan(pkg.packageCode);
    setCreating(true);
    try {
      const res = await apiRequest<{ proposal: { proposalCode: string } }>(
        `/${division}/proposals/from-package`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageCode: pkg.packageCode }),
        },
        division as Division
      );
      const code = res.proposal?.proposalCode;
      if (code) navigate(`/${division}/proposals?proposal=${encodeURIComponent(code)}`);
      else navigate(`/${division}/proposals`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create your proposal. Please try again.", { duration: 4000 });
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading">Plans</h1>
        <p className="text-sm text-muted mt-0.5">
          {account ? `${account.name} · ${account.accountCode}` : "Choose the plan that fits your business."}
          {selectedPlanId
            ? " Your selected plan from the website is highlighted below."
            : " All plans are available — pick the one that works for you."}
        </p>
      </div>

      {customNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-neutral-surface rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-start gap-3">
              <Check className="h-6 w-6 text-accent mt-0.5 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-heading">Your request for a proposal has been received</h3>
                <p className="text-sm text-muted mt-2">{customNotice}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomNotice(null)}
                className="cursor-pointer px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomNotice(null);
                  navigate(`/${division}/messages`);
                }}
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90"
              >
                Continue conversation <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !creating && setConfirmPlan(null)}>
          <div className="bg-neutral-surface rounded-2xl w-full max-w-lg shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0">
                  {(() => { const Icon = PLAN_ICONS[confirmPlan.icon] ?? PackageIcon; return <Icon className="h-5 w-5" /> })()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-heading leading-tight">{confirmPlan.name}</h3>
                  <p className="text-xs text-muted">{confirmPlan.tagline}</p>
                </div>
              </div>
              <button onClick={() => setConfirmPlan(null)} disabled={creating} className="cursor-pointer w-8 h-8 rounded-lg hover:bg-neutral-bg text-muted hover:text-heading flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-neutral-bg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2">Selected plan</p>
              <p className="text-sm font-semibold text-heading">{confirmPlan.name} {billing === "annual" ? "(Annual)" : "(Monthly)"}</p>
              {confirmPlan.pricing ? (
                <p className="text-sm text-muted mt-1">
                  {inr.format(confirmPlan.pricing.setup ?? 0)} one-time + {inr.format(billing === "annual" ? (confirmPlan.pricing.annual ?? confirmPlan.pricing.monthly ?? 0) : (confirmPlan.pricing.monthly ?? 0))} {billing === "annual" ? "/yr" : "/mo"}
                </p>
              ) : (
                <p className="text-sm text-muted mt-1">Custom pricing — we’ll confirm after review.</p>
              )}
              <p className="text-xs text-muted mt-2">We’ll prepare a proposal for this plan. You can switch plans before confirming.</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmPlan(null)}
                disabled={creating}
                className="cursor-pointer px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-neutral-bg transition-colors disabled:opacity-50"
              >
                Go back to switch plan
              </button>
              <button
                type="button"
                onClick={confirmRequest}
                disabled={creating}
                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-fg font-semibold text-sm rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Request proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingCatalog ? (
        <div className="space-y-6 animate-pulse">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div>
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-4 w-48 rounded mt-1" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div>
                    <Skeleton className="h-6 w-32 rounded" />
                    <Skeleton className="h-4 w-24 rounded mt-1" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded" />
              </div>
              <Skeleton className="h-4 w-full rounded mb-4" />
              <div className="mb-4">
                <Skeleton className="h-8 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded mt-1" />
                <Skeleton className="h-3 w-32 rounded mt-1" />
                <Skeleton className="h-3 w-40 rounded mt-1" />
              </div>
              <Skeleton className="h-4 w-full rounded" />
              <SkeletonList items={4} />
              <Skeleton className="h-11 w-full rounded-lg mt-5" />
            </SkeletonCard>
          ))}
        </div>
      ) : catalogError ? (
        <div className="rounded-xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">{catalogError}</div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl bg-neutral-surface p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
            <PackageIcon className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-heading mb-1">No plans available</h3>
          <p className="text-sm text-muted max-w-[320px]">Plans will appear here shortly.</p>
        </div>
      ) : (
        <>
          {plans.some((plan) => plan.pricing) && (
            <div className="flex justify-center mb-8">
              <BillingToggle value={billing} onChange={setBilling} />
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.icon] ?? PackageIcon;
            const isSelected = selectedId === plan.id;
            const annual = billing === "annual";
            const recurring = annual ? (plan.pricing?.annual ?? 0) : (plan.pricing?.monthly ?? 0);
            const hasPricing = Boolean(plan.pricing);
            return (
              <div
                key={plan.id}
                onClick={() => setActivePlan(plan.id)}
                className={cn(
                  "cursor-pointer rounded-2xl bg-neutral-surface border p-6 flex flex-col transition-colors",
                  isSelected ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-accent/40",
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl border border-border bg-accent/10 text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-heading leading-tight">{plan.name}</h3>
                      {plan.featured && <span className="text-xs font-semibold text-accent">Most popular</span>}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center rounded-full bg-accent text-accent-fg px-2.5 py-0.5 text-xs font-semibold shrink-0">
                      Selected
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted mb-4">{plan.tagline}</p>

                <div className="mb-4">
                  {hasPricing ? (
                    <>
                      <span className="text-2xl font-extrabold text-heading">{inr.format(plan.pricing!.setup ?? 0)}</span>
                      <span className="text-sm text-muted ml-1">one-time</span>
                      <div className="text-sm text-muted mt-1">
                        + {inr.format(recurring)} <span>{cycleSuffix}</span>
                      </div>
                      {plan.pricing?.minimumMonths && (
                        <div className="text-xs text-muted mt-1">
                          {annual
                            ? "Annual care · billed once a year"
                            : `${plan.pricing.minimumMonths}-month minimum · cancel anytime after`}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl font-extrabold text-heading">Let&apos;s Talk</span>
                  )}
                </div>

                <div className="flex-1 space-y-2 mb-5">
                  {plan.services.map((svc, i) => (
                    <div key={svc.id ?? i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span className="text-sm text-body">
                        {svc.label}
                        {svc.scope && <span className="block text-xs text-muted">{svc.scope}</span>}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={creating}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoose(plan);
                  }}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-accent text-accent-fg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && !plan.custom ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isSelected ? "Continue" : plan.ctaLabel}
                </button>
              </div>
            );
          })}

          {customPkg && (() => {
            const setup = customPkg.oneTimeEnabled ? customPkg.oneTimeFee ?? 0 : 0
            const recurring = customPkg.recurringEnabled ? customPkg.recurringFee ?? 0 : 0
            const freqSuffix = customPkg.recurringFrequency === "ANNUAL" ? "/yr" : "/mo"
            const isSelected = selectedId === customPkg.packageCode
            return (
              <div
                key={customPkg.packageCode}
                onClick={() => setActivePlan(customPkg.packageCode)}
                className={cn(
                  "cursor-pointer rounded-2xl bg-neutral-surface border p-6 flex flex-col transition-colors",
                  isSelected ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-accent/40"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl border border-border bg-accent/10 text-accent">
                      <PackageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-heading leading-tight">{customPkg.name}</h3>
                      <span className="text-xs font-semibold text-accent">Tailored for you</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center rounded-full bg-accent text-accent-fg px-2.5 py-0.5 text-xs font-semibold shrink-0">
                      Selected
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted mb-4">{customPkg.description || "Your custom plan, prepared by our team."}</p>

                <div className="mb-4">
                  {setup > 0 || recurring > 0 ? (
                    <>
                      {setup > 0 && (
                        <>
                          <span className="text-2xl font-extrabold text-heading">{inr.format(setup)}</span>
                          <span className="text-sm text-muted ml-1">one-time</span>
                        </>
                      )}
                      {recurring > 0 && (
                        <div className="text-sm text-muted mt-1">
                          + {inr.format(recurring)} <span>{freqSuffix}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl font-extrabold text-heading">Let&apos;s Talk</span>
                  )}
                </div>

                {customPkg.services.length > 0 && (
                  <div className="flex-1 space-y-2 mb-5">
                    {customPkg.services.map((svc, i) => (
                      <div key={svc.serviceCode || i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm text-body">{svc.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={creating}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestFromPackage(customPkg);
                  }}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-accent text-accent-fg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && isSelected ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isSelected ? "Continue" : "Request proposal"}
                </button>
              </div>
            )
          })()}
        </div>
      </>
      )}

      {accountPkgs.filter((p) => p.type !== "CUSTOM").length > 0 && (
        <div className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-heading mb-4">Your plans</h2>
          <div className="space-y-3">
            {accountPkgs.filter((p) => p.type !== "CUSTOM").map((p) => (
              <div key={p._id} className="group rounded-2xl bg-neutral-surface border border-border p-4 flex items-center justify-between gap-4 hover:border-accent/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <PackageIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-heading truncate">{p.name}</p>
                    <p className="text-xs text-muted font-mono truncate">{p.packageCode} · {p.services.length} service{p.services.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-600">
                    {p.deliveryStatus}
                  </span>
                  <span className="text-muted group-hover:text-accent transition-colors">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
