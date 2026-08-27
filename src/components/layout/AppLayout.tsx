import { NavLink, Outlet, useLocation, Link } from "react-router-dom"
import { LayoutDashboard, LogOut, X, AlertTriangle, Loader2, Bell, Sun, Moon, Package, MessageSquare, FileText, ShoppingBag, Receipt, ChevronRight, Home, Menu } from "lucide-react"
import { Fragment, useState, useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "@/auth/auth-context"
import { useDivision, useTheme } from "@/theme/theme-provider"
import { BrandMark } from "@/components/brand/BrandMark"
import { Dropdown } from "@/components/ui/dropdown"
import { useSwipeDrawer } from "@/hooks/useSwipeDrawer"
import { cn } from "@/lib/cn"
import { apiRequest, chatApiRequest, getChatUrl, getToken } from "@/lib/api"

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard", plans: "Plans", packages: "Plans", messages: "Messages",
  proposals: "Proposals", orders: "Orders", billing: "Billing", settings: "Settings",
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const division = useDivision()
  const { mode, toggle } = useTheme()
  const location = useLocation()

  const segments = location.pathname.replace(`/${division}`, "").split("/").filter(Boolean)
  const initials = (user?.name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "" })
  const [settingsError, setSettingsError] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [account, setAccount] = useState<{ accountCode: string; company?: string; lifecycleStage: string } | null>(null)
  const { mobileOpen, setMobileOpen, isDragging, sidebarStyle, backdropOpacity, handlers } = useSwipeDrawer()

  useEffect(() => {
    if (!division) return
    apiRequest<{ success: boolean; account?: { accountCode: string; company?: string; lifecycleStage: string } }>(`/${division}/account`, {}, division!)
      .then((d) => setAccount(d.account ?? null))
      .catch(() => setAccount(null))
  }, [division])

  const NAV: Array<{ to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean; badge?: number }> = [
    ...(division === "print"
      ? [{ to: `/${division}`, label: "Dashboard", icon: LayoutDashboard, end: true }]
      : []),
    ...(division === "digital"
      ? [
          { to: `/${division}/plans`, label: "Plans", icon: Package },
          { to: `/${division}/proposals`, label: "Proposals", icon: FileText },
          { to: `/${division}/orders`, label: "Orders", icon: ShoppingBag },
          { to: `/${division}/billing`, label: "Billing", icon: Receipt },
        ]
      : []),
    { to: `/${division}/messages`, label: "Messages", icon: MessageSquare, badge: unreadCount || undefined },
  ]

  useEffect(() => {
    if (!division) return
    const poll = () => chatApiRequest<{ success: boolean; messages?: Array<{ isRead: boolean; sender: string }> }>(`/${division}/chat`, {}, division!, { silent: true })
        .then((d) => {
          const msgs = d.messages || []
          setUnreadCount(msgs.filter((m) => m.sender === "agent" && !m.isRead).length)
        }).catch(() => {})
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
    if (settingsOpen) {
      setProfileForm({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" })
      setDeleteConfirm(false)
      setSettingsError("")
    }
  }, [settingsOpen, user])

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

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
    <div
      className="h-[100dvh] flex bg-neutral-bg overflow-hidden"
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
    >
      {/* Mobile backdrop — also reacts to drag */}
      {(mobileOpen || isDragging) && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="cursor-pointer fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          style={backdropOpacity !== undefined ? { opacity: backdropOpacity / 0.5, backgroundColor: `rgba(0,0,0,${backdropOpacity})` } : undefined}
        />
      )}
      {/* Edge swipe handle — visual hint on mobile */}
      {!mobileOpen && !isDragging && (
        <div className="lg:hidden fixed left-0 top-0 bottom-0 w-3 z-20 touch-manipulation" aria-hidden="true" />
      )}
      {/* Sidebar — drawer on mobile, static on lg */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] bg-neutral-surface flex flex-col border-r border-border shadow-2xl lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 lg:shadow-none ${!isDragging ? "transition-transform duration-300" : ""} ${!isDragging ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : ""}`}
        style={sidebarStyle}
      >
        <div className="h-16 shrink-0 px-5 flex items-center gap-3">
          <Link to={`/${division}`} className="flex items-center gap-3 hover:opacity-90">
            <BrandMark size={40} />
            <div>
              <h1 className="text-[15px] font-bold text-heading leading-tight tracking-tight">Nexbaron Hub</h1>
              <p className="text-[11px] capitalize text-muted">{division} division</p>
            </div>
          </Link>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Menu</p>
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-accent/10 text-accent" : "text-muted hover:text-heading hover:bg-neutral-bg"
              )}>
              {({ isActive }) => (
                <>
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                  {badge ? (
                    <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-accent" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 mt-2 space-y-2">
          <button onClick={toggle}
            className="cursor-pointer flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted hover:text-heading hover:bg-neutral-bg transition-colors">
            {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {mode === "dark" ? "Switch to Light" : "Switch to Dark"}
          </button>

          <div className="pt-2 mt-2">
            <div className="w-full flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-heading truncate">{user?.name}</p>
                {account?.accountCode && (
                  <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5">
                    <span className="text-[11px] font-extrabold font-mono tracking-wide text-accent">{account.accountCode}</span>
                  </div>
                )}
                {account?.company && <p className="text-[11px] text-muted truncate mt-0.5">{account.company}</p>}
                <button onClick={() => setSettingsOpen(true)}
                  className="cursor-pointer text-[11px] capitalize text-muted truncate block w-full text-left hover:text-accent mt-0.5">
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 sm:h-16 bg-neutral-bg flex items-center justify-between px-4 sm:px-6 shrink-0 gap-3 sm:gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="cursor-pointer lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-surface border border-border text-muted hover:text-heading shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
            <Link to={`/${division}`} className="flex items-center gap-1.5 text-muted hover:text-heading transition-colors shrink-0">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline capitalize font-medium">{division}</span>
            </Link>
            {segments.length === 0 ? (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
                <span className="font-semibold text-heading truncate">Dashboard</span>
              </>
            ) : (
              segments.map((seg, idx) => {
                const isLast = idx === segments.length - 1
                const raw = PAGE_TITLES[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                const label = raw.length > 24 ? raw.slice(0, 24) + "…" : raw
                const href = `/${division}/${segments.slice(0, idx + 1).join("/")}`
                return (
                  <Fragment key={href}>
                    <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
                    {isLast ? (
                      <span className="font-semibold text-heading truncate" title={raw}>{label}</span>
                    ) : (
                      <Link to={href} className="text-muted hover:text-heading truncate transition-colors" title={raw}>{label}</Link>
                    )}
                  </Fragment>
                )
              })
            )}
          </nav>
          <div className="flex items-center gap-3">
            <Dropdown
              aria-label="Notifications"
              menuClassName="w-72"
              trigger={
                <button className="cursor-pointer relative flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-surface border border-border text-muted hover:text-heading hover:border-accent/30 transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white leading-none ring-2 ring-neutral-bg">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              }
            >
              {(close) => (
                <>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-heading">Messages</h3>
                    <button onClick={close} className="cursor-pointer text-muted hover:text-heading"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-4 text-center">
                    {unreadCount > 0 ? (
                       <Link to={`/${division}`} onClick={close}
                         className="text-sm text-accent hover:underline">
                         {unreadCount} new message{unreadCount > 1 ? "s" : ""} — open
                       </Link>
                    ) : (
                      <p className="text-sm text-muted">No new messages</p>
                    )}
                  </div>
                </>
              )}
            </Dropdown>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto overscroll-contain">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="cursor-pointer fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSettingsOpen(false)}>
          <div className="bg-neutral-surface rounded-2xl w-full max-w-md max-h-[90dvh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-lg font-bold text-heading">Account Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="cursor-pointer text-muted hover:text-heading"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4">
                <div className="w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold">{initials}</div>
                <div>
                  <p className="font-semibold text-heading">{user?.name}</p>
                  {account?.accountCode && (
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-1">
                      <span className="text-xs font-extrabold font-mono tracking-wide text-accent">{account.accountCode}</span>
                    </div>
                  )}
                  {account?.company && <p className="text-xs text-muted mt-1">{account.company}</p>}
                  <p className="text-xs text-muted mt-1">Update your account details below</p>
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
                className="cursor-pointer w-full py-2.5 bg-accent text-accent-fg font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
              </button>
              <div className="pt-4">
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
