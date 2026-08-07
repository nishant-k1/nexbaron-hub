import { Send, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/api";
import { useAuth } from "@/auth/auth-context";
import { useDivision } from "@/theme/theme-provider";

interface ChatMessage {
  _id: string;
  message: string;
  sender: "customer" | "agent";
  createdAt: string;
  isRead: boolean;
}

export default function ChatPage() {
  const { user } = useAuth();
  const division = useDivision();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(() => {
    if (!division) return;
    setLoading(true);
    apiRequest<{ success: boolean; messages: ChatMessage[] }>(`/${division}/chat`, {}, division)
      .then((data) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [division]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !division) return;
      setSending(true);
      try {
        await apiRequest(`/${division}/chat`, {
          method: "POST",
          body: JSON.stringify({
            message: text.trim(),
            name: user?.name,
          }),
        }, division);
        setInput("");
        loadMessages();
      } catch {
        /* ignore */
      } finally {
        setSending(false);
      }
    },
    [division, user, loadMessages],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-heading">Chat</h2>
        <p className="text-sm text-muted">
          Continue conversations you started on the website.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-neutral-surface/50 p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted text-center">
            <div>
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No conversations yet.</p>
              <p className="text-xs mt-1">
                Start a chat on the website — it will appear here.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.sender === "customer"
                    ? "bg-accent text-white rounded-br-md"
                    : "bg-neutral-bg border border-border text-heading rounded-bl-md"
                }`}
              >
                {msg.message}
                <div className="text-[10px] mt-1 opacity-60">
                  {new Date(msg.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={sending}
          className="flex-1 px-4 py-3 bg-neutral-surface border border-border rounded-xl text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-4 py-3 bg-accent text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
