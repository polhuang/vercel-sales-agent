"use client";

import * as React from "react";
import { Bot, Send, X, Loader2, Wrench } from "lucide-react";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Input } from "@sales-agent/ui/components/primitives/input";
import { useUIStore } from "@sales-agent/ui/stores/ui-store";
import { cn } from "@sales-agent/ui/lib/utils";

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

let msgCounter = 0;

export function ChatbotPanel() {
  const { chatbotOpen, toggleChatbot } = useUIStore();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  React.useEffect(() => {
    if (chatbotOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [chatbotOpen]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        toggleChatbot();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleChatbot]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = {
      id: `msg-${++msgCounter}`,
      role: "user",
      content: text,
    };
    const assistantMsg: Message = {
      id: `msg-${++msgCounter}`,
      role: "assistant",
      content: "",
      toolCalls: [],
    };

    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop()!;

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(event.slice(6));
            handleStreamEvent(data, assistantMsg.id);
          } catch {
            // skip malformed events
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1]!;
        msgs[msgs.length - 1] = {
          ...last,
          content: "Failed to get response. Please try again.",
        };
        return msgs;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleStreamEvent = (
    data: { type: string; content?: string; name?: string; input?: unknown; result?: unknown; message?: string },
    assistantId: string
  ) => {
    setMessages((prev) => {
      const msgs = [...prev];
      const idx = msgs.findIndex((m) => m.id === assistantId);
      if (idx < 0) return prev;
      const msg = { ...msgs[idx]! };

      if (data.type === "text") {
        msg.content += data.content ?? "";
      } else if (data.type === "tool_use") {
        msg.toolCalls = [
          ...(msg.toolCalls ?? []),
          {
            name: data.name!,
            input: data.input as Record<string, unknown>,
          },
        ];
      } else if (data.type === "tool_result") {
        const calls = [...(msg.toolCalls ?? [])];
        const tcIdx = calls.findIndex(
          (c) => c.name === data.name && !c.result
        );
        if (tcIdx >= 0) {
          calls[tcIdx] = { ...calls[tcIdx]!, result: data.result };
        }
        msg.toolCalls = calls;
      } else if (data.type === "error") {
        msg.content += `Error: ${data.message}`;
      }

      msgs[idx] = msg;
      return msgs;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!chatbotOpen && (
        <button
          onClick={toggleChatbot}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          title="Open assistant (Ctrl+J)"
        >
          <Bot size={20} />
        </button>
      )}

      {/* Panel overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-all duration-200",
          chatbotOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            chatbotOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={toggleChatbot}
        />

        <div
          className={cn(
            "absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-background shadow-lg transition-transform duration-200 ease-out",
            chatbotOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot size={16} />
              <h2 className="text-sm font-semibold">Assistant</h2>
            </div>
            <button
              onClick={toggleChatbot}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto p-4"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Bot size={32} />
                <p className="text-sm">How can I help with your pipeline?</p>
                <p className="text-[11px]">
                  Try: &quot;Show me open deals&quot; or &quot;Update Acme&apos;s next
                  step&quot;
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-2",
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                {msg.toolCalls?.map((tc, i) => (
                  <div
                    key={i}
                    className="w-full rounded-md border border-border bg-muted/50 px-3 py-2"
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wrench size={10} />
                      <span className="font-medium">
                        {formatToolName(tc.name)}
                      </span>
                    </div>
                    {tc.result != null && (
                      <pre className="max-h-32 overflow-x-auto overflow-y-auto text-[11px] text-muted-foreground">
                        {formatToolResult(tc.result)}
                      </pre>
                    )}
                  </div>
                ))}

                {(msg.content || (msg.role === "assistant" && !streaming)) && (
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {msg.content}
                  </div>
                )}

                {msg.role === "assistant" && !msg.content && streaming && (
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <Loader2
                      size={14}
                      className="animate-spin text-muted-foreground"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your pipeline..."
                className="flex-1 text-sm"
                disabled={streaming}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || streaming}
              >
                {streaming ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Ctrl+J to toggle
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function formatToolName(name: string): string {
  return name.replace(/_/g, " ");
}

function formatToolResult(result: unknown): string {
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    return result
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const r = item as Record<string, unknown>;
          const parts = Object.entries(r)
            .filter(([k]) => k !== "id" && k !== "type")
            .map(([k, v]) => `${k}: ${v ?? "-"}`)
            .join(", ");
          return `${r.type ? `[${r.type}] ` : ""}${parts}`;
        }
        return String(item);
      })
      .join("\n");
  }
  return JSON.stringify(result, null, 2);
}
