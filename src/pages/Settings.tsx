import { User, Mail, Phone } from "lucide-react";
import { useAuth } from "@/auth/auth-context";

export default function Settings() {
  const { user } = useAuth();
  const initials = (user?.name || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Your account details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-1 rounded-2xl bg-neutral-surface border border-border p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-xl font-bold mb-4">
            {initials}
          </div>
          <h2 className="font-bold text-heading text-lg">{user?.name}</h2>
          <p className="text-xs text-muted mt-1">{user?.email || user?.phone}</p>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 rounded-2xl bg-neutral-surface border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-heading">Account Information</h2>
          </div>
          <div className="divide-y divide-border/40">
            <div className="flex items-center gap-4 px-6 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted">Name</p>
                <p className="text-sm text-heading">{user?.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted">Email</p>
                <p className="text-sm text-heading">{user?.email || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted">Phone</p>
                <p className="text-sm text-heading">{user?.phone || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
