import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowRight, Package, Clock, CheckCircle2, Circle, MessageSquare, AlertCircle, CreditCard, FileText } from "lucide-react"
import { useAuth } from "@/auth/auth-context"
import { fetchMyProjects, type ProjectSummary, type PipelineStage, PIPELINE_LABELS, PIPELINE_STAGES } from "@/lib/api"

const STAGE_COLORS: Record<PipelineStage, string> = {
  inquiry: "bg-slate-500",
  proposal: "bg-blue-500",
  commit: "bg-amber-500",
  build: "bg-purple-500",
  delivery: "bg-emerald-500",
}

const MONEY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export default function ProjectsPage() {
  const { user } = useAuth()
  const division = user?.division
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [pipeline, setPipeline] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!division) return
    setLoading(true)
    setError(null)
    fetchMyProjects(division)
      .then((d) => { setProjects(d.projects); setPipeline(d.pipeline) })
      .catch(() => setError("Could not load your projects"))
      .finally(() => setLoading(false))
  }, [division])

  if (!division) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading">Your Projects</h1>
        <p className="text-sm text-muted mt-0.5">Track the status of all your requests and orders</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 flex flex-col items-center text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
          <h3 className="font-semibold text-heading mb-1">Something went wrong</h3>
          <p className="text-sm text-muted mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer">Retry</button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl bg-neutral-surface border border-border p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-heading mb-1">No projects yet</h3>
          <p className="text-sm text-muted max-w-[320px] mb-6">
            When you submit a quote request, make a purchase, or chat with us, your projects will appear here.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[280px]">
            {division === "digital" ? (
              <Link to={`/${division}/plan`} className="px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" /> Browse Plans
              </Link>
            ) : (
              <a href="https://www.nexbaron.com/print/quote" className="px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" /> Request a Quote
              </a>
            )}
            <Link to={`/${division}/chat`} className="px-4 py-2 border border-border rounded-xl text-sm text-muted hover:text-heading transition-colors cursor-pointer inline-flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" /> Start a conversation
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Pipeline overview */}
          <div className="flex gap-1 bg-neutral-surface rounded-xl p-1 w-full overflow-x-auto">
            {PIPELINE_STAGES.map((s) => (
              <div key={s} className="flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[s]}`} />
                <span className="text-[11px] font-semibold text-heading uppercase">{PIPELINE_LABELS[s]}</span>
                <span className="text-[11px] text-muted tabular-nums">{(pipeline as any)[s] ?? 0}</span>
              </div>
            ))}
          </div>

          {/* Project Cards */}
          <div className="grid gap-3">
            {projects.map((project) => (
              <Link
                key={project.projectId}
                to={`/${division}/projects/${project.projectId}`}
                className="block rounded-2xl bg-neutral-surface border border-border p-5 hover:border-accent/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${STAGE_COLORS[project.stage]}`} />
                    <h3 className="text-sm font-bold text-heading">{project.customerName}</h3>
                    {project.plan && <span className="text-xs text-accent font-medium">{project.plan}</span>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-heading transition-colors" />
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-muted">
                  <span className="capitalize">{project.stage}</span>
                  <span>·</span>
                  <span className="capitalize">{project.source}</span>
                  {project.latestOrder && <><span>·</span><span>{MONEY.format(project.latestOrder.amount)}</span></>}
                  {project.latestQuote?.price && <><span>·</span><span>Quote: {MONEY.format(project.latestQuote.price)}</span></>}
                </div>

                {/* Progress Bar */}
                {project.latestOrder && project.latestOrder.milestones.total > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted mb-1">
                      <span>Progress</span>
                      <span>{project.latestOrder.milestones.done}/{project.latestOrder.milestones.total} milestones</span>
                    </div>
                    <div className="h-1.5 bg-neutral-bg rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.round((project.latestOrder.milestones.done / project.latestOrder.milestones.total) * 100)}%` }} />
                    </div>
                  </div>
                )}

                {/* Unread chat badge */}
                {project.unreadChats > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-accent">
                    <MessageSquare className="h-3 w-3" />
                    {project.unreadChats} new message{project.unreadChats !== 1 ? "s" : ""}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
