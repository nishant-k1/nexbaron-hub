import { NavLink, Outlet, useLocation, Link } from "react-router-dom"
import { LayoutDashboard, FileText, Receipt, MessageCircle, LogOut, X, AlertTriangle, Loader2, Bell, Sun, Moon } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "@/auth/auth-context"
import { useDivision, useTheme } from "@/theme/theme-provider"
import { BrandMark } from "@/components/brand/BrandMark"
import { cn } from "@/lib/cn"
import { apiRequest, chatApiRequest, getChatUrl, getToken } from "@/lib/api"

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard", orders: "My Orders", progress: "Progress", chat: "Chat",
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const division = useDivision()
  const { mode, toggle } = useTheme()
  const location = useLocation()

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
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!division) return
    const poll = () => {
      chatApiRequest<{ success: boolean; messages?: Array<{ isRead: boolean; sender: string }> }>(`/${division}/chat`, {}, division!)
        .then((d) => {
          const msgs = d.messages || []
          setUnreadCount(msgs.filter((m) => m.sender === "agent" && !m.isRead).length)
        }).catch(() => {})
    }
    poll()
    let socket: Socket | null = null
    const token = getToken(division)
    socket = io(getChatUrl(), {
      transports: ["websocket"],
      auth: { division, ...(token ? { token } : {}) },
    })
    socket.on("message:new", poll)
    socket.on("message:read", poll)
    return () => { socket?.disconnect() }
  }, [division])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [notifOpen])

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
      }, division!)
      setSettingsOpen(false); window.location.reload()
    } catch { setSettingsError("Failed to update profile") } finally { setSaving(false) }
  }

  const handleDeleteAccount = async () => {
    setSaving(true)
    try {
      await apiRequest(`/${division}/auth/delete-account`, { method: "DELETE" }, division!)
      signOut()
    } catch { setSettingsError("Failed to delete account"); setSaving(false) }
  }

  return (
    <div className="h-screen flex bg-neutral-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 h-full border-r border-border bg-neutral-surface/80 backdrop-blur shrink-0 flex flex-col">
        <Link to={`/${division}`} className="h-16 shrink-0 px-5 border-b border-border flex items-center gap-3 hover:bg-neutral-surface/50">
          <BrandMark size={40} />
          <div>
            <h1 className="text-[15px] font-bold text-heading leading-tight tracking-tight">Nexbaron Hub</h1>
            <p className="text-[11px] capitalize text-muted">{division} division</p>
          </div>
        </Link>

        <nav className="px-3 py-4 space-y-1 flex-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Menu</p>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-accent/10 text-accent" : "text-muted hover:text-heading hover:bg-neutral-bg"
              )}>
              {({ isActive }) => (
                <>
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-accent" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <button onClick={toggle}
            className="cursor-pointer flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted hover:text-heading hover:bg-neutral-bg transition-colors">
            {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {mode === "dark" ? "Switch to Light" : "Switch to Dark"}
          </button>

          <div className="pt-2 mt-2 border-t border-border">
            <div className="w-full flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-heading truncate">{user?.name}</p>
                <button onClick={() => setSettingsOpen(true)}
                  className="cursor-pointer text-[11px] capitalize text-muted truncate block w-full text-left hover:text-accent">
                  Account settings
                </button>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="cursor-pointer text-muted hover:text-red-500 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-neutral-surface/70 backdrop-blur flex items-center justify-between px-6 shrink-0 shadow-[0_1px_0_0_var(--border),0_1px_8px_-2px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-heading tracking-tight">{pageTitle}</h2>
            {segments.length > 1 && (
              <span className="text-muted text-sm">/ {segments[1]}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div ref={notifRef} className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="cursor-pointer relative text-muted hover:text-heading transition-colors">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-neutral-surface">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-heading">Messages</h3>
                    <button onClick={() => setNotifOpen(false)} className="cursor-pointer text-muted hover:text-heading"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-4 text-center">
                    {unreadCount > 0 ? (
                      <Link to={`/${division}/chat`} onClick={() => setNotifOpen(false)}
                        className="text-sm text-accent hover:underline">
                        {unreadCount} new message{unreadCount > 1 ? "s" : ""} — open Chat
                      </Link>
                    ) : (
                      <p className="text-sm text-muted">No new messages</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
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
