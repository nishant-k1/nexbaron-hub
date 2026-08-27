import { User, Mail, Phone, Building2, Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/auth-context";
import { useDivision } from "@/theme/theme-provider";
import { apiRequest, type Division } from "@/lib/api";

export default function Settings() {
  const { user } = useAuth();
  const division = useDivision();
  const [account, setAccount] = useState<{ accountCode: string; company?: string; lifecycleStage: string } | null>(null);
  useEffect(() => {
    if (!division) return;
    apiRequest<{ account: { accountCode: string; company?: string; lifecycleStage: string } | null }>(`/${division}/account`, {}, division as Division)
      .then((d) => setAccount(d.account ?? null))
      .catch(() => setAccount(null));
  }, [division]);
  const initials = (user?.name || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 sm:space-y-8">
      <p className="text-sm text-muted">Your account details</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Profile card */}
        <div className="md:col-span-1 rounded-2xl bg-neutral-surface border border-border p-4 sm:p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-xl font-bold mb-4">
            {initials}
          </div>
          <h2 className="font-bold text-heading text-lg">{user?.name}</h2>
          <p className="text-xs text-muted mt-1">{user?.email || user?.phone}</p>
          {account?.accountCode && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3.5 py-1.5">
              <Hash className="w-4 h-4 text-accent" />
              <span className="text-sm font-mono font-extrabold tracking-wide text-accent">{account.accountCode}</span>
            </div>
          )}
          {account?.company && <p className="text-xs text-muted mt-2">{account.company}</p>}
          {account?.lifecycleStage && <p className="text-[11px] text-muted mt-1 capitalize">{account.lifecycleStage.toLowerCase().replace("_", " ")}</p>}
        </div>

        {/* Details */}
        <div className="md:col-span-2 rounded-2xl bg-neutral-surface border border-border overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-heading">Account Information</h2>
          </div>
          <div className="divide-y divide-border/40">
            {account?.accountCode && (
              <div className="flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0">
                  <Hash className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Account ID</p>
                  <p className="text-lg font-mono font-extrabold tracking-tight text-heading break-all">{account.accountCode}</p>
                </div>
              </div>
            )}
            {account?.company && (
              <div className="flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-3.5">
                <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted">Company</p>
                  <p className="text-sm text-heading break-words">{account.company}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-3.5">
              <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted">Name</p>
                <p className="text-sm text-heading break-words">{user?.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-3.5">
              <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted">Email</p>
                <p className="text-sm text-heading break-all">{user?.email || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-3.5">
              <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted">Phone</p>
                <p className="text-sm text-heading break-all">{user?.phone || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
