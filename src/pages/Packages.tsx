import { useEffect, useState } from "react";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import { Package as PackageIcon } from "lucide-react";

interface PackageService {
  serviceCode: string;
  name: string;
  description?: string;
}

interface Pkg {
  _id: string;
  packageCode: string;
  name: string;
  description?: string;
  deliveryStatus: "ANALYSIS" | "IN_PROGRESS" | "REVIEW" | "DELIVERED";
  services: PackageService[];
  oneTimeFee?: number;
  recurringFee?: number;
  recurringFrequency?: "MONTHLY" | "ANNUAL";
}

interface Account {
  accountCode: string;
  name: string;
  email?: string;
  lifecycleStage: string;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const STATUS_LABELS: Record<Pkg["deliveryStatus"], string> = {
  ANALYSIS: "Analysis",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DELIVERED: "Delivered",
};

const STATUS_STYLES: Record<Pkg["deliveryStatus"], string> = {
  ANALYSIS: "bg-blue-500/15 text-blue-600",
  IN_PROGRESS: "bg-amber-500/15 text-amber-600",
  REVIEW: "bg-purple-500/15 text-purple-600",
  DELIVERED: "bg-emerald-500/15 text-emerald-600",
};

export default function Packages() {
  const division = useDivision();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      apiRequest<{ packages: Pkg[] }>(`/${division}/packages`, {}, division as Division),
      apiRequest<{ account: Account | null }>(`/${division}/account`, {}, division as Division),
    ])
      .then(([p, a]) => {
        if (!active) return;
        setPackages(p.packages || []);
        setAccount(a.account ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load packages");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [division]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Your Packages</h1>
        <p className="text-sm text-muted mt-0.5">
          {account ? `${account.name} · ${account.accountCode}` : "Service packages and their delivery status."}
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted">Loading packages…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">{error}</div>
      ) : packages.length === 0 ? (
        <div className="rounded-xl bg-neutral-surface p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
            <PackageIcon className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-heading mb-1">No packages yet</h3>
          <p className="text-sm text-muted max-w-[320px]">
            When a package is created for your account, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map((p) => (
            <div key={p._id} className="rounded-2xl bg-neutral-surface border border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-heading">{p.name}</p>
                  <p className="text-xs text-muted">{p.packageCode}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[p.deliveryStatus]}`}
                >
                  {STATUS_LABELS[p.deliveryStatus]}
                </span>
              </div>

              {p.description && <p className="text-sm text-muted mt-2">{p.description}</p>}

              {p.services.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {p.services.map((s) => (
                    <li key={s.serviceCode} className="text-sm text-body">
                      • {s.name}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 text-sm text-muted">
                {p.oneTimeFee != null && <span>One-time: {inr.format(p.oneTimeFee)}</span>}
                {p.oneTimeFee != null && p.recurringFee != null && <span> · </span>}
                {p.recurringFee != null && (
                  <span>
                    Recurring: {inr.format(p.recurringFee)} / {p.recurringFrequency || "—"}
                  </span>
                )}
                {p.oneTimeFee == null && p.recurringFee == null && <span>No pricing set</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
