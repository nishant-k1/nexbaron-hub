import { FileText } from "lucide-react"

export default function Orders() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">My Orders</h1>
      <div className="p-12 rounded-xl bg-neutral-surface border border-border text-center">
        <FileText className="h-10 w-10 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-heading mb-2">No orders yet</h3>
        <p className="text-sm text-muted">Your order history will appear here.</p>
      </div>
    </div>
  )
}
