import { Clock } from "lucide-react"

export default function Progress() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">Track Progress</h1>
      <div className="p-12 rounded-xl bg-neutral-surface border border-border text-center">
        <Clock className="h-10 w-10 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-heading mb-2">No active projects</h3>
        <p className="text-sm text-muted">Your project progress will appear here once you have an active order.</p>
      </div>
    </div>
  )
}
