import { NavLink, Outlet, useLocation, Link } from "react-router-dom"
import { LayoutDashboard, FileText, Receipt, Settings, LogOut, Cpu, Printer, Moon, Sun, MessageCircle } from "lucide-react"
import { useAuth } from "@/auth/auth-context"
import { useDivision, useTheme } from "@/theme/theme-provider"
import { cn } from "@/lib/cn"

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard", orders: "My Orders", progress: "Progress", settings: "Settings",
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
    { to: `/${division}/settings`, label: "Settings", icon: Settings },
    { to: `/${division}/chat`, label: "Chat", icon: MessageCircle },
  ]

  const segments = location.pathname.replace(`/${division}`, "").split("/").filter(Boolean)
  const pageTitle = PAGE_TITLES[segments[0] || ""] || "Dashboard"
  const initials = (user?.name || "?")
    .split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()

  return (
    <div className="h-screen flex bg-neutral-bg overflow-hidden" style={{ "--accent-color": isPrint ? "#f59e0b" : "#14b8a6" } as React.CSSProperties}>
      <aside className="w-56 border-r border-border bg-neutral-surface shrink-0 flex flex-col">
        <Link to={`/${division}`} className="p-4 border-b border-border flex items-center gap-3 hover:bg-white/5">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${isPrint ? "from-amber-500 to-orange-500" : "from-teal-500 to-cyan-400"} flex items-center justify-center text-white font-bold text-sm`}>
            N
          </div>
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

        <div className="p-3 border-t border-border space-y-2">
          <button
            onClick={toggle}
            className="cursor-pointer cursor-pointer flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted hover:text-heading hover:bg-white/5"
          >
            {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {mode === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-heading truncate">{user?.name}</p>
              <p className="text-[10px] text-muted">{user?.email || user?.phone}</p>
            </div>
            <button onClick={signOut} title="Sign out" className="cursor-pointer text-muted hover:text-red-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-neutral-surface/60 backdrop-blur flex items-center justify-between px-6 shrink-0">
          <h2 className="text-base font-semibold text-heading">{pageTitle}</h2>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isPrint ? "bg-amber-500/10 text-amber-400" : "bg-teal-500/10 text-teal-400"}`}>
              {isPrint ? <Printer className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
              {division} hub
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
