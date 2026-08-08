import { Send, MessageCircle, Paperclip, X, Image, FileText, Film, Download, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/api";
import { useAuth } from "@/auth/auth-context";
import { useDivision } from "@/theme/theme-provider";

interface ChatAttachment { url: string; type: "image" | "video" | "document"; name: string; size?: number }
interface ChatMessage {
  _id: string; message: string; sender: "customer" | "agent";
  attachments?: ChatAttachment[]; createdAt: string; isRead: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(() => {
    if (!division) return;
    setLoading(true);
    apiRequest<{ success: boolean; messages: ChatMessage[] }>(`/${division}/chat`, {}, division!)
      .then((data) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [division]);

  useEffect(() => { loadMessages() }, [loadMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages]);

  // Poll for read receipts every 10s
  useEffect(() => {
    if (!division) return
    const interval = setInterval(() => loadMessages(), 10000)
    return () => clearInterval(interval)
  }, [division, loadMessages]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !division) return;
    setUploading(true);
    try {
      const sig = await apiRequest<{ cloudName: string; apiKey: string; timestamp: number; signature: string; uploadUrl: string }>(
        `/${division}/upload-signature`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder: `nexbaron-chat-${division}` }) }, division!
      );
      const newAttachments: ChatAttachment[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) { alert(`${file.name} is too large (max 10MB)`); continue }
        const fd = new FormData()
        fd.append("file", file); fd.append("api_key", sig.apiKey)
        fd.append("timestamp", String(sig.timestamp)); fd.append("signature", sig.signature)
        fd.append("folder", `nexbaron-chat-${division}`)
        const res = await fetch(sig.uploadUrl, { method: "POST", body: fd })
        const json = await res.json()
        if (json.secure_url) {
          newAttachments.push({
            url: json.secure_url, name: file.name, size: file.size,
            type: json.resource_type === "image" ? "image" : json.resource_type === "video" ? "video" : "document",
          })
        }
      }
      setAttachments(prev => [...prev, ...newAttachments])
    } catch { } finally { setUploading(false); if (fileRef.current) fileRef.current.value = "" }
  };

  const sendMessage = useCallback(async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || !division) return;
    setSending(true);
    try {
      await apiRequest(`/${division}/chat`, {
        method: "POST",
        body: JSON.stringify({
          message: text.trim(), name: user?.name, email: user?.email, phone: user?.phone,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      }, division!);
      setInput(""); setAttachments([]);
      loadMessages();
    } catch { } finally { setSending(false) }
  }, [division, user, attachments, loadMessages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-heading">Chat</h2>
        <p className="text-sm text-muted">Continue conversations you started on the website.</p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-neutral-surface/50 p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
          messages.map((msg) => (
            <div key={msg._id} className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                msg.sender === "customer" ? "bg-accent text-white rounded-br-md" : "bg-neutral-bg border border-border text-heading rounded-bl-md"
              }`}>
                {msg.message && <p>{msg.message}</p>}
                {msg.attachments?.map((a, i) => (
                  <div key={i} className="mt-2">
                    {a.type === "image" ? (
                      <div className="relative group">
                        <img src={a.url} alt={a.name} className="rounded-lg max-w-full max-h-48 object-cover" />
                        <a href={a.url.replace("/upload/", "/upload/fl_attachment/")} download={a.name} target="_blank" rel="noopener noreferrer"
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <a href={a.url.replace("/upload/", "/upload/fl_attachment/")} download={a.name} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-xs ${msg.sender === "customer" ? "bg-white/10 hover:bg-white/20" : "bg-neutral-surface hover:bg-neutral-bg"} transition-colors`}>
                        {getAttachIcon(a.type)} {a.name}
                        <Download className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                ))}
                <div className="text-[10px] mt-1 flex items-center gap-1.5" style={{ color: msg.sender === "customer" ? "rgba(255,255,255,0.85)" : "rgba(100,116,139,0.9)" }}>
                  {new Date(msg.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {msg.sender === "customer" && (
                    msg.isRead
                      ? <span className="flex items-center gap-0.5 font-medium" style={{ color: "rgba(255,255,255,0.7)", fontSize: "10px" }}><CheckCheck className="w-3.5 h-3.5" /> Seen</span>
                      : <span style={{ color: "rgba(255,255,255,0.45)" }}><CheckCheck className="w-3.5 h-3.5" /></span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachments.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-surface border border-border text-xs">
              {a.type === "image" ? <img src={a.url} alt="" className="w-6 h-6 rounded object-cover" /> : getAttachIcon(a.type)}
              <span className="text-heading truncate max-w-[120px]">{a.name}</span>
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-muted hover:text-red-400"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="mt-3 flex gap-2">
        <input type="file" ref={fileRef} onChange={handleFilePick} className="hidden" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="cursor-pointer px-3 py-3 bg-neutral-surface border border-border rounded-xl text-muted hover:text-accent hover:border-accent/30 disabled:opacity-50 transition-colors">
          {uploading ? <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-5 h-5" />}
        </button>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." disabled={sending}
          className="flex-1 px-4 py-3.5 bg-neutral-surface border border-border rounded-xl text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50 disabled:opacity-50" />
        <button type="submit" disabled={(!input.trim() && attachments.length === 0) || sending}
          className="cursor-pointer px-5 py-3.5 bg-accent text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
