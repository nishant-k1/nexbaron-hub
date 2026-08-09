import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, CheckCircle2, Circle, Clock, FileText, Receipt, MessageSquare } from "lucide-react"
import { useAuth } from "@/auth/auth-context"
import { fetchMyProject, type ProjectDetail, type PipelineStage, PIPELINE_LABELS, PIPELINE_STAGES } from "@/lib/api"

const STAGE_COLORS: Record<PipelineStage, string> = {
  inquiry: "bg-slate-500",
  proposal: "bg-blue-500",
  commit: "bg-amber-500",
  build: "bg-purple-500",
  delivery: "bg-emerald-500",
}

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export default function ProjectDetailPage() {
  const { user } = useAuth()
  const division = user?.division
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!division || !projectId) return
    setLoading(true)
    setError(null)
    fetchMyProject(division, projectId)
      .then((d) => setProject(d.project))
      .catch(() => setError("Could not load project"))
      .finally(() => setLoading(false))
  }, [division, projectId])

  if (!division || !projectId) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link to={`/${division}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-heading transition-colors cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 flex flex-col items-center text-center">
          <h3 className="font-semibold text-heading mb-1">Project not found</h3>
          <p className="text-sm text-muted">{error || "This project may have been removed."}</p>
        </div>
      </div>
    )
  }

  const stageIndex = PIPELINE_STAGES.indexOf(project.stage)
  const lead = project.lead
  const latestQuote = project.quotes.length > 0 ? project.quotes[project.quotes.length - 1] : null
  const latestOrder = project.orders.length > 0 ? project.orders[project.orders.length - 1] : null

  return (
    <div className="space-y-6">
      <Link to={`/${division}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-heading transition-colors cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      {/* Header */}
      <div className="rounded-2xl bg-neutral-surface border border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-heading">{lead.name}</h1>
            <p className="text-sm text-muted mt-1 capitalize">{lead.status} · {PIPELINE_LABELS[project.stage]}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${STAGE_COLORS[project.stage]}`} />
            <span className="text-sm font-semibold text-heading">{PIPELINE_LABELS[project.stage]}</span>
          </div>
        </div>
      </div>

      {/* Pipeline progress */}
      <div className="rounded-2xl bg-neutral-surface border border-border p-5">
        <h3 className="text-xs font-semibold text-muted uppercase mb-4">Pipeline</h3>
        <div className="flex items-center gap-1">
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${i <= stageIndex ? STAGE_COLORS[s] : "bg-border"}`} />
              <span className="text-[10px] text-muted text-center">{PIPELINE_LABELS[s]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders */}
        <div className="rounded-2xl bg-neutral-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-semibold text-heading">Orders</h3>
          </div>
          {project.orders.length === 0 ? (
            <p className="text-sm text-muted italic">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {project.orders.map((order) => (
                <div key={order._id} className="rounded-lg bg-neutral-bg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-heading capitalize">{order.status.replace("_", " ")}</span>
                    <span className="text-sm font-bold text-heading">{MONEY.format(order.amount)}</span>
                  </div>
                  {order.milestones && order.milestones.length > 0 && (
                    <div className="space-y-1.5">
                      {order.milestones.map((m) => (
                        <div key={m.key} className="flex items-center gap-2">
                          {m.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : m.status === "in_progress" ? <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Circle className="h-3.5 w-3.5 text-muted shrink-0" />}
                          <span className={`text-xs ${m.status === "done" ? "text-muted line-through" : "text-heading"}`}>{m.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {order.invoiceNumber && <p className="text-[10px] text-muted mt-2">Invoice: {order.invoiceNumber}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quotes */}
        <div className="rounded-2xl bg-neutral-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-semibold text-heading">Quotes</h3>
          </div>
          {project.quotes.length === 0 ? (
            <p className="text-sm text-muted italic">No quotes yet</p>
          ) : (
            <div className="space-y-3">
              {project.quotes.map((q) => (
                <div key={q._id} className="rounded-lg bg-neutral-bg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted uppercase">{q.quoteNumber}</span>
                    <span className="text-xs text-muted capitalize">{q.status}</span>
                  </div>
                  {q.response?.price && (
                    <p className="text-sm font-bold text-heading mt-1">{MONEY.format(q.response.price)}</p>
                  )}
                  {q.response?.message && <p className="text-xs text-body mt-1">{q.response.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      {project.chat.length > 0 && (
        <div className="rounded-2xl bg-neutral-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-semibold text-heading">Messages</h3>
            <Link to={`/${division}/chat`} className="ml-auto text-xs text-accent hover:opacity-80 transition-opacity cursor-pointer">View all</Link>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {project.chat.map((msg) => (
              <div key={msg._id} className={`flex ${msg.sender === "customer" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.sender === "customer" ? "bg-neutral-bg text-heading" : "bg-accent/10 text-heading"}`}>
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
