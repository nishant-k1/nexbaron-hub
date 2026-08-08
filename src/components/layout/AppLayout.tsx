import { NavLink, Outlet, useLocation, Link } from "react-router-dom"
import { LayoutDashboard, FileText, Receipt, MessageCircle, LogOut, Cpu, Printer, Moon, Sun, Settings, User, X, Mail, Phone, ChevronRight } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/auth/auth-context"
import { useDivision, useTheme } from "@/theme/theme-provider"
import { cn } from "@/lib/cn"

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard", orders: "My Orders", progress: "Progress", chat: "Chat",
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const division = useDivision()
  const { mode, toggle } = useTheme()
  const location = useLocation()
  const isPrint = division === "print"
  const accent = isPrint ? "amber" : "teal"

  const NAV = [
    { to: `/${division}`, label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: `/${division}/orders`, label: "My Orders", icon: FileText },
    { to: `/${division}/progress`, label: "Progress", icon: Receipt },
    { to: `/${division}/chat`, label: "Chat", icon: MessageCircle },
  ]

  const segments = location.pathname.replace(`/${division}`, "").split("/").filter(Boolean)
  const pageTitle = PAGE_TITLES[segments[0] || ""] || segments[0] || "Dashboard"
  const initials = (user?.name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()

  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  return (
    <div className="h-screen flex bg-neutral-bg overflow-hidden" style={{ "--accent-color": isPrint ? "#f59e0b" : "#14b8a6" } as React.CSSProperties}>
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-neutral-surface shrink-0 flex flex-col">
        <Link to={`/${division}`} className="p-4 border-b border-border flex items-center gap-3 hover:bg-white/5">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${isPrint ? "from-amber-500 to-orange-500" : "from-teal-500 to-cyan-400"} flex items-center justify-center text-white font-bold text-sm`}>N</div>
          <div>
            <h1 className="text-sm font-bold text-heading leading-tight">Nexbaron Hub</h1>
            <p className="text-[10px] capitalize text-muted">{division}</p>
          </div>
        </Link>

        <nav className="px-3 py-4 space-y-1 flex-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">Menu</p>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-accent/10 text-accent" : "text-muted hover:text-heading hover:bg-white/5"
              )}>
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <Link to="/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-heading hover:bg-white/5 transition-colors">
            <Cpu className="h-4 w-4" />
            Website
            <ChevronRight className="h-3 w-3 ml-auto" />
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-neutral-surface/60 backdrop-blur flex items-center justify-between px-6 shrink-0">
          <h2 className="text-base font-semibold text-heading">{pageTitle}</h2>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isPrint ? "bg-amber-500/10 text-amber-400" : "bg-teal-500/10 text-teal-400"}`}>
              {isPrint ? <Printer className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
              {division}
            </span>

            {/* User menu */}
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="cursor-pointer flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-neutral-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-heading">{user?.name}</p>
                    <p className="text-xs text-muted mt-0.5">{user?.email || user?.phone}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setSettingsOpen(true); setMenuOpen(false) }}
                      className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-body hover:bg-neutral-bg transition-colors">
                      <Settings className="w-4 h-4 text-muted" /> Settings
                    </button>
                    <button onClick={toggle}
                      className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-body hover:bg-neutral-bg transition-colors">
                      {mode === "dark" ? <Sun className="w-4 h-4 text-muted" /> : <Moon className="w-4 h-4 text-muted" />}
                      {mode === "dark" ? "Light mode" : "Dark mode"}
                    </button>
                  </div>
                  <div className="border-t border-border py-1">
                    <button onClick={signOut}
                      className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/5 transition-colors">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSettingsOpen(false)}>
          <div className="bg-neutral-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-heading">Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="cursor-pointer text-muted hover:text-heading">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-lg font-bold">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-heading">{user?.name}</p>
                  <p className="text-xs text-muted">{user?.email || user?.phone}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-muted" />
                  <span className="text-muted w-14">Name</span>
                  <span className="text-heading">{user?.name || "—"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted" />
                  <span className="text-muted w-14">Email</span>
                  <span className="text-heading">{user?.email || "—"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted" />
                  <span className="text-muted w-14">Phone</span>
                  <span className="text-heading">{user?.phone || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
