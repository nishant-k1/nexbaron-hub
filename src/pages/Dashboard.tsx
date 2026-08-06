import { FileText, TrendingUp, Clock, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "@/auth/auth-context"
import { useDivision } from "@/theme/theme-provider"

export default function Dashboard() {
  const { user } = useAuth()
  const division = useDivision()
  const isPrint = division === "print"

  const stats = [
    { label: "Active Orders", value: "—", icon: FileText },
    { label: isPrint ? "Quotes Received" : "Current Plan", value: "—", icon: TrendingUp },
    { label: isPrint ? "In Production" : "Days to Launch", value: "—", icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted mt-1">Here's an overview of your {division} account.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="p-5 rounded-xl bg-neutral-surface border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent"><s.icon className="h-5 w-5" /></div>
              <span className="text-xs text-muted uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-3xl font-bold text-heading">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link to={`/${division}/orders`}
          className="p-6 rounded-xl bg-neutral-surface border border-border hover:border-accent/30 transition-colors group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-heading">Your Orders</h3>
              <p className="text-sm text-muted mt-1">{isPrint ? "Track print orders and download invoices" : "View your plan and payment history"}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted group-hover:text-accent transition-colors" />
          </div>
        </Link>

        <Link to={`/${division}/progress`}
          className="p-6 rounded-xl bg-neutral-surface border border-border hover:border-accent/30 transition-colors group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-heading">Track Progress</h3>
              <p className="text-sm text-muted mt-1">{isPrint ? "See production status and delivery estimates" : "Watch your website build in real-time"}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted group-hover:text-accent transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  )
}
