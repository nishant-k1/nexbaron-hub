import { NavLink, Outlet, useLocation, Link } from "react-router-dom"
import { LayoutDashboard, FileText, Receipt, MessageCircle, LogOut, Cpu, Printer, X, AlertTriangle, Loader2, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/auth/auth-context"
import { useDivision } from "@/theme/theme-provider"
import { cn } from "@/lib/cn"
import { apiRequest } from "@/lib/api"

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard", orders: "My Orders", progress: "Progress", chat: "Chat",
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const division = useDivision()
  const location = useLocation()
  const isPrint = division === "print"

  const NAV = [
    { to: `/${division}`, label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: `/${division}/orders`, label: "My Orders", icon: FileText },
    { to: `/${division}/progress`, label: "Progress", icon: Receipt },
    { to: `/${division}/chat`, label: "Chat", icon: MessageCircle },
  ]

  const segments = location.pathname.replace(`/${division}`, "").split("/").filter(Boolean)
  const pageTitle = PAGE_TITLES[segments[0] || ""] || segments[0] || "Dashboard"
  const initials = (user?.name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "" })
  const [settingsError, setSettingsError] = useState("")

  useEffect(() => {
    if (settingsOpen) {
      setProfileForm({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" })
      setDeleteConfirm(false)
      setSettingsError("")
    }
  }, [settingsOpen, user])

  const handleUpdateProfile = async () => {
    setSaving(true); setSettingsError("")
    try {
      await apiRequest(`/${division}/auth/update-profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      }, division)
      setSettingsOpen(false); window.location.reload()
    } catch { setSettingsError("Failed to update profile") } finally { setSaving(false) }
  }

  const handleDeleteAccount = async () => {
    setSaving(true)
    try {
      await apiRequest(`/${division}/auth/delete-account`, { method: "DELETE" }, division)
      signOut()
    } catch { setSettingsError("Failed to delete account"); setSaving(false) }
  }

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

        <div className="p-3 border-t border-border space-y-2">
          <button onClick={() => setSettingsOpen(true)}
            className="cursor-pointer w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">{initials}</div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-heading truncate">{user?.name}</p>
              <p className="text-[10px] text-muted">{user?.email || user?.phone}</p>
            </div>
          </button>
          <button onClick={signOut}
            className="cursor-pointer w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted hover:text-red-400 hover:bg-red-500/5 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-neutral-surface/60 backdrop-blur flex items-center justify-between px-6 shrink-0">
          <h2 className="text-base font-semibold text-heading">{pageTitle}</h2>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isPrint ? "bg-amber-500/10 text-amber-400" : "bg-teal-500/10 text-teal-400"}`}>
            {isPrint ? <Printer className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
            {division}
          </span>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSettingsOpen(false)}>
          <div className="bg-neutral-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-heading">Account Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="cursor-pointer text-muted hover:text-heading"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-xl font-bold">{initials}</div>
                <div>
                  <p className="font-semibold text-heading">{user?.name}</p>
                  <p className="text-xs text-muted">Update your account details below</p>
                </div>
              </div>
              <div className="space-y-3">
                <div><label className="block text-xs text-muted mb-1">Name</label>
                  <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-bg border border-border rounded-xl text-sm text-heading focus:outline-none focus:border-accent/50" />
                </div>
                <div><label className="block text-xs text-muted mb-1">Email</label>
                  <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-bg border border-border rounded-xl text-sm text-heading focus:outline-none focus:border-accent/50" />
                </div>
                <div><label className="block text-xs text-muted mb-1">Phone</label>
                  <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-bg border border-border rounded-xl text-sm text-heading focus:outline-none focus:border-accent/50" />
                </div>
              </div>
              {settingsError && <p className="text-sm text-red-400">{settingsError}</p>}
              <button onClick={handleUpdateProfile} disabled={saving}
                className="cursor-pointer w-full py-2.5 bg-accent text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
              </button>
              <div className="pt-4 border-t border-border">
                {!deleteConfirm ? (
                  <button onClick={() => setDeleteConfirm(true)}
                    className="cursor-pointer w-full py-2.5 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/5 transition-colors flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Delete Account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-400 text-center">This is permanent. All your data will be deleted.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteConfirm(false)} className="cursor-pointer flex-1 py-2.5 border border-border rounded-xl font-medium hover:bg-neutral-bg transition-colors text-sm">Cancel</button>
                      <button onClick={handleDeleteAccount} disabled={saving} className="cursor-pointer flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Yes, Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
