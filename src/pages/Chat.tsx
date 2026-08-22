import { Send, MessageCircle, Paperclip, X, Image, FileText, Film, Download, CheckCheck, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Socket } from "socket.io-client";

import { apiRequest, chatApiRequest, getChatUrl } from "@/lib/api";
import { connectChatSocket } from "@/lib/chat-socket";
import { getToken } from "@/lib/api";
import { useAuth } from "@/auth/auth-context";
import { useDivision } from "@/theme/theme-provider";

interface ChatAttachment { url: string; type: "image" | "video" | "document"; name: string; size?: number }
interface ChatMessage {
  _id: string; message: string; sender: "customer" | "agent";
  attachments?: ChatAttachment[]; createdAt: string; isRead: boolean;
  edited?: boolean; deletedAt?: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "bmp", "ico"]
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "mkv", "avi"]

// Cloudinary treats PDFs as `resource_type: "image"`, so we must classify from
// the actual file (MIME/extension) rather than the upload response.
function typeFromFile(file: File): "image" | "video" | "document" {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (IMAGE_EXTENSIONS.includes(ext)) return "image"
  if (VIDEO_EXTENSIONS.includes(ext)) return "video"
  return "document"
}

// Documents (PDFs, office files) can't render in an <img>; images can.
function renderAsImage(a: ChatAttachment): boolean {
  if (a.type !== "image") return false
  const ext = a.name.split(".").pop()?.toLowerCase() ?? ""
  return IMAGE_EXTENSIONS.includes(ext)
}

// fl_attachment forces a file download; the plain URL lets the browser preview.
// R2 URLs have no /upload/ segment — proxy through the API to force download.
function downloadUrl(a: ChatAttachment, division: string | null): string {
  if (a.url.includes("/upload/")) {
    return a.url.replace("/upload/", "/upload/fl_attachment/")
  }
  const api = getChatUrl()
  return `${api}/${division}/chat/download?url=${encodeURIComponent(a.url)}&name=${encodeURIComponent(a.name)}`
}

function getAttachIcon(type: string) {
  if (type === "image") return <Image className="w-4 h-4" />
  if (type === "video") return <Film className="w-4 h-4" />
  return <FileText className="w-4 h-4" />
}

export default function ChatPage() {
  const { user } = useAuth();
  const division = useDivision();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sameList = (a: ChatMessage[], b: ChatMessage[]) =>
    a.length === b.length &&
    a.every((m, i) =>
      m._id === b[i]._id && m.message === b[i].message && m.isRead === b[i].isRead &&
      m.sender === b[i].sender && (m.attachments?.length || 0) === (b[i].attachments?.length || 0)
    )

  // `initial` shows the loading spinner; polling refreshes silently in-place.
  const loadMessages = useCallback((initial = false) => {
    if (!division) return;
    if (initial) { setLoading(true); setLoadError(null); }
    chatApiRequest<{ success: boolean; messages: ChatMessage[]; hasMore?: boolean }>(`/${division}/chat`, {}, division!, initial ? {} : { silent: true })
      .then((data) => setMessages((prev) => {
        const next = data.messages || [];
        setHasMore(!!data.hasMore)
        return sameList(prev, next) ? prev : next;
      }))
      .catch(() => { if (initial) setLoadError("Could not load conversations") })
      .finally(() => { if (initial) setLoading(false) });
  }, [division]);

  const loadOlderMessages = useCallback(async () => {
    if (!division || !hasMore || loadingOlder) return
    setLoadingOlder(true)
    const panel = messagesEndRef.current?.parentElement
    const prevScrollHeight = panel?.scrollHeight ?? 0
    const prevScrollTop = panel?.scrollTop ?? 0
    try {
      const oldest = messages[0]
      const data = await chatApiRequest<{ success: boolean; messages: ChatMessage[]; hasMore?: boolean }>(
        `/${division}/chat?before=${oldest?._id ?? ""}`, {}, division!, { silent: true }
      )
      setMessages((prev) => [...(data.messages || []), ...prev])
      setHasMore(!!data.hasMore)
      requestAnimationFrame(() => {
        const el = messagesEndRef.current?.parentElement
        if (el && prevScrollHeight) el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop
      })
    } catch { /* keep */ }
    finally { setLoadingOlder(false) }
  }, [division, hasMore, loadingOlder, messages])

  useEffect(() => { loadMessages(true) }, [loadMessages]);

  // Realtime: live-update when new agent messages arrive or read status changes.
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    if (!division) return;
    socketRef.current?.disconnect();
    const socket = connectChatSocket({
      division,
      token: getToken(division),
      sessionId: undefined,
      onEvent: (event, cb) => {
        if (event === "message:new" || event === "message:read" || event === "message:updated" || event === "message:deleted") {
          loadMessages(false);
        }
      },
    });
    // Typing indicator handled via an explicit listener (the helper also
    // forwards it through onEvent, which we ignore for typing).
    socket?.on("typing", (payload: { sender?: string; isTyping?: boolean }) => {
      setAgentTyping(payload.sender === "agent" && !!payload.isTyping)
    })
    socketRef.current = socket;
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, [division, loadMessages]);

  // Mark agent replies as read whenever the chat page is open (authenticated
  // customer → backend matches by customerId).
  useEffect(() => {
    if (!division) return
    chatApiRequest(`/${division}/chat/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }, division!, { silent: true }).catch(() => {})
  }, [division, messages])

  // Presence heartbeat so the CRM shows an accurate online indicator.
  useEffect(() => {
    if (!division) return
    const beat = () => {
      chatApiRequest(`/${division}/chat/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }, division!, { silent: true }).catch(() => {})
    }
    beat()
    const interval = setInterval(beat, 30000)
    return () => clearInterval(interval)
  }, [division])

  // Always scroll to the latest message so new content is visible.
  const scrollToLatest = useCallback(() => {
    const el = messagesEndRef.current?.parentElement
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  // After messages change, wait a frame for layout then snap to the bottom.
  useEffect(() => {
    const raf = requestAnimationFrame(scrollToLatest)
    return () => cancelAnimationFrame(raf)
  }, [messages, scrollToLatest])

  // Messages can grow after the messages effect runs (images/video decode
  // asynchronously). While pinned near the bottom, follow every content-size
  // change so the newest message never lands half off-screen.
  useEffect(() => {
    const el = messagesEndRef.current?.parentElement
    if (!el) return
    let raf = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(scrollToLatest)
    })
    observer.observe(el)
    return () => { observer.disconnect(); cancelAnimationFrame(raf) }
  }, [scrollToLatest]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !division) return;
    setUploading(true);
    setUploadError(null);
    try {
      const sig = await chatApiRequest<{ success: boolean; files: { key: string; uploadUrl: string; publicUrl: string }[] }>(
        `/${division}/upload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: files.map(f => ({ name: f.name, size: f.size })) }) }, division!
      );
      const newAttachments: ChatAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const target = sig.files[i];
        if (!target) continue;
        if (file.size > MAX_FILE_SIZE) { alert(`${file.name} is too large (max 10MB)`); continue }
        const res = await fetch(target.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        })
        if (!res.ok) {
          setUploadError(`Could not upload ${file.name} (${res.status})`)
          continue
        }
        newAttachments.push({
          url: target.publicUrl, name: file.name, size: file.size,
          type: typeFromFile(file),
        })
      }
      setAttachments(prev => [...prev, ...newAttachments])
    } catch (err) { setUploadError(err instanceof Error ? err.message : "Could not upload attachment") } finally { setUploading(false); if (fileRef.current) fileRef.current.value = "" }
  };

  const sendMessage = useCallback(async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || !division) return;
    setSending(true);
    setSendError(null);
    try {
      await chatApiRequest(`/${division}/chat`, {
        method: "POST",
        body: JSON.stringify({
          message: text.trim(), name: user?.name, email: user?.email, phone: user?.phone,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      }, division!);
      setInput(""); setAttachments([]);
      loadMessages();
    } catch (err) { setSendError(err instanceof Error ? err.message : "Could not send message") } finally { setSending(false) }
  }, [division, user, attachments, loadMessages]);

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-neutral-bg shadow-lg">
      <p className="text-sm text-muted px-4 py-3 bg-neutral-surface">Continue conversations you started on the website.</p>

      <div className="flex-1 overflow-y-auto bg-neutral-bg p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-muted" />
              <p className="text-sm font-medium text-heading">{loadError}</p>
              <button onClick={() => loadMessages()} className="cursor-pointer mt-3 px-4 py-2 bg-accent text-accent-fg rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Retry</button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted text-center">
            <div>
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No conversations yet.</p>
              <p className="text-xs mt-1">Start a chat on the website — it will appear here.</p>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center">
                <button onClick={loadOlderMessages} disabled={loadingOlder}
                  className="cursor-pointer text-xs px-3 py-1.5 rounded-lg bg-neutral-surface border border-border text-muted hover:text-heading disabled:opacity-50">
                  {loadingOlder ? "Loading…" : "Load older messages"}
                </button>
              </div>
            )}
            {messages.map((msg) => (
            <div key={msg._id} className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                msg.sender === "customer" ? "bg-accent-dim text-white rounded-br-md" : "bg-neutral-surface text-heading rounded-bl-md"
              }`}>
                {msg.deletedAt ? (
                  <p className="italic opacity-60">This message was deleted</p>
                ) : (
                  <>
                    {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}
                    {msg.attachments?.map((a, i) => (
                      <div key={i} className="mt-2">
                        {renderAsImage(a) ? (
                          <div className="relative group">
                            <img src={a.url} alt={a.name} className="rounded-lg max-w-full max-h-48 object-cover" />
                            <a href={downloadUrl(a, division)} download={a.name} target="_blank" rel="noopener noreferrer"
                              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${msg.sender === "customer" ? "bg-white/10" : "bg-neutral-surface"} transition-colors`}>
                            <span className="shrink-0">{getAttachIcon(a.type)}</span>
                            <span className="truncate flex-1 min-w-0">{a.name}</span>
                            <a href={a.url} target="_blank" rel="noopener noreferrer" title="Open" aria-label={`Open ${a.name}`}
                              className="p-1 rounded hover:bg-white/10 transition-colors">
                              <span className="sr-only">Open</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a href={downloadUrl(a, division)} download={a.name} title="Download" aria-label={`Download ${a.name}`}
                              className="p-1 rounded hover:bg-white/10 transition-colors">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
                <div className="text-[10px] mt-1 flex items-center gap-1.5" style={{ color: msg.sender === "customer" ? "rgba(255,255,255,0.75)" : "rgba(100,116,139,0.9)" }}>
                  {new Date(msg.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {msg.edited && !msg.deletedAt && <span className="opacity-70">· edited</span>}
                  {msg.sender === "customer" && (
                    msg.isRead
                      ? <span className="flex items-center gap-0.5 font-medium" style={{ color: "rgba(255,255,255,0.7)", fontSize: "10px" }}><CheckCheck className="w-3.5 h-3.5" /> Seen</span>
                      : <span style={{ color: "rgba(255,255,255,0.45)" }}><CheckCheck className="w-3.5 h-3.5" /></span>
                  )}
                </div>
              </div>
            </div>
            ))}
            {agentTyping && (
              <div className="flex justify-start">
                <div className="max-w-[75%] px-4 py-3 rounded-2xl text-sm bg-neutral-bg border border-border text-heading rounded-bl-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-[11px] text-muted ml-1">typing…</span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachments.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-bg text-xs">
              {renderAsImage(a) ? <img src={a.url} alt="" className="w-6 h-6 rounded object-cover" /> : getAttachIcon(a.type)}
              <span className="text-heading truncate max-w-[120px]">{a.name}</span>
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-muted hover:text-red-400"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
      {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
      {sendError && <p className="text-xs text-red-400 mt-2">{sendError}</p>}

      <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="p-3 bg-neutral-surface flex gap-2">
        <input type="file" ref={fileRef} onChange={handleFilePick} className="hidden" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="cursor-pointer px-3 py-3 bg-neutral-bg rounded-xl text-muted hover:text-accent disabled:opacity-50 transition-colors">
          {uploading ? <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-5 h-5" />}
        </button>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." disabled={sending}
          className="flex-1 px-4 py-3.5 bg-neutral-bg rounded-xl text-sm text-heading placeholder:text-muted focus:outline-none disabled:opacity-50" />
        <button type="submit" disabled={(!input.trim() && attachments.length === 0) || sending}
          className="cursor-pointer px-5 py-3.5 bg-accent text-accent-fg rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
