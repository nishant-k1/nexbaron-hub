import { User, Mail, Phone, Shield } from "lucide-react"
import { useAuth } from "@/auth/auth-context"

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-heading">Account Settings</h1>
      <div className="p-6 rounded-xl bg-neutral-surface border border-border space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center text-lg font-bold">
            {(user?.name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-heading">{user?.name}</p>
            <p className="text-xs text-muted">{user?.email || user?.phone}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm"><User className="h-4 w-4 text-muted" /><span className="text-muted w-16">Name</span><span className="text-heading">{user?.name}</span></div>
          <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted" /><span className="text-muted w-16">Email</span><span className="text-heading">{user?.email || "—"}</span></div>
          <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted" /><span className="text-muted w-16">Phone</span><span className="text-heading">{user?.phone || "—"}</span></div>
        </div>
      </div>
    </div>
  )
}
