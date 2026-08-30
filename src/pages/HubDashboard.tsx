import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";
import { useEntityLabels } from "@/lib/metadata";
import { Package, FileText, Receipt, MessageSquare, ArrowUpRight, Hash } from "lucide-react";

interface Account {
  accountCode: string;
  name: string;
  email?: string;
  lifecycleStage: string;
}

export default function HubDashboard() {
  const division = useDivision();
  const lifecycleLabels = useEntityLabels("lifecycle");
  const [account, setAccount] = useState<Account | null>(null);
  const [counts, setCounts] = useState({ packages: 0, proposals: 0, invoices: 0 });

  useEffect(() => {
    if (!division) return;
    Promise.all([
      apiRequest<{ account: Account | null }>(`/${division}/account`, {}, division as Division).catch(() => null),
      division === "digital"
        ? apiRequest<{ packages: unknown[] }>(`/${division}/packages`, {}, division as Division).catch(() => null)
        : Promise.resolve(null),
      division === "digital"
        ? apiRequest<{ proposals: unknown[] }>(`/${division}/proposals`, {}, division as Division).catch(() => null)
        : Promise.resolve(null),
      division === "digital"
        ? apiRequest<{ invoices: unknown[] }>(`/${division}/billing/invoices`, {}, division as Division).catch(() => null)
        : Promise.resolve(null),
    ]).then(([acc, pkg, prp, inv]) => {
      setAccount(acc?.account ?? null);
      setCounts({
        packages: pkg?.packages?.length ?? 0,
        proposals: prp?.proposals?.length ?? 0,
        invoices: inv?.invoices?.length ?? 0,
      });
    });
  }, [division]);

  const cards =
    division === "digital"
      ? [
          { to: `/${division}/plans`, label: "Plans", desc: "Track delivery of your service plans.", icon: Package, count: counts.packages },
          { to: `/${division}/proposals`, label: "Proposals", desc: "Review and respond to proposals.", icon: FileText, count: counts.proposals },
          { to: `/${division}/billing`, label: "Billing", desc: "View invoices and make payments.", icon: Receipt, count: counts.invoices },
          { to: `/${division}/messages`, label: "Messages", desc: "Chat with our team.", icon: MessageSquare, count: 0 },
        ]
      : [
          { to: `/${division}/messages`, label: "Messages", desc: "Chat with our team.", icon: MessageSquare, count: 0 },
        ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-heading">Welcome back{account ? `, ${account.name.split(" ")[0]}` : ""}</h1>
          <p className="text-sm text-muted mt-0.5 capitalize">{division} division</p>
        </div>
        {account && (
          <span className="rounded-full bg-accent/10 text-accent px-3 py-1.5 text-xs font-medium shrink-0 self-start sm:self-auto">
            {lifecycleLabels[account.lifecycleStage] || account.lifecycleStage}
          </span>
        )}
      </div>

      {account && (
        <div className="rounded-2xl bg-neutral-surface border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Account ID</p>
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-heading mt-1 font-mono break-all">{account.accountCode}</p>
              {account.email && <p className="text-sm text-muted mt-1 break-all">{account.email}</p>}
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0">
              <Hash className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="cursor-pointer group rounded-2xl bg-neutral-surface border border-border p-4 sm:p-6 hover:border-accent/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-heading">{c.label}</h3>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted group-hover:text-accent transition-colors" />
            </div>
            <p className="text-sm text-muted mt-3">{c.desc}</p>
            {c.count > 0 && (
              <p className="text-xs text-muted mt-3">{c.count} item{c.count > 1 ? "s" : ""}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
