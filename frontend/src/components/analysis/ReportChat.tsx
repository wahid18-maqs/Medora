"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Mic, RefreshCw, Loader2, Bot, User } from "lucide-react";
import { useReportChat } from "@/hooks/useReportChat";
import { stripMarkdown } from "@/lib/utils";

interface ReportChatProps {
  reportId: string;
}

export default function ReportChat({ reportId }: ReportChatProps) {
  const { messages, isLoading, isError, sendMessage, isSending } = useReportChat(reportId);
  const [inputText, setInputText] = useState("");
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  };

  useEffect(() => {
    if (messages.length > 0 || isSending) scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isSending) return;

    if (!textToSend) {
      setInputText("");
    }
    setFailedMessage(null);

    try {
      await sendMessage(text);
    } catch (err) {
      setFailedMessage(text);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Messages Thread Container */}
      <div
        ref={messagesContainerRef}
        className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
      >
        <div className="flex min-h-full flex-col gap-3">
          {isLoading && (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin" size={18} />
              <span>Loading conversation...</span>
            </div>
          )}

          {isError && (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-destructive">
              Failed to load chat history. Please try refreshing.
            </div>
          )}

          {!isLoading && !isError && messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground">
              <Bot size={32} className="mb-2 text-muted-foreground/60" />
              <p className="font-medium text-foreground">Have questions about this report?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask any question below to get answers grounded specifically in your test results.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id || idx}
                className={`flex gap-2 text-sm ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground border border-border rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {isUser ? msg.content : stripMarkdown(msg.content)}
                  </p>
                  {msg.timestamp && (
                    <span
                      className={`block text-[10px] mt-1 ${
                        isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} />
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-2 text-sm justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} />
              </div>
              <div className="bg-muted text-muted-foreground border border-border rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1.5 text-xs">
                <Loader2 className="animate-spin" size={14} />
                <span>Analyzing report & thinking...</span>
              </div>
            </div>
          )}

          {failedMessage && (
            <div className="flex flex-col items-end gap-1">
              <div className="text-xs text-destructive flex items-center gap-1">
                <span>Message failed to send</span>
                <button
                  type="button"
                  onClick={() => handleSend(failedMessage)}
                  className="underline hover:text-destructive font-medium flex items-center gap-0.5 cursor-pointer ml-1"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Field Area - Pinned to bottom of chat panel */}
      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-2 border-t border-border bg-muted/50 p-3"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question about this report..."
            disabled={isSending}
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
        </div>

        {/* Disabled Voice Mic Trigger */}
        <button
          type="button"
          disabled
          title="Voice input coming soon"
          className="p-2 text-muted-foreground bg-muted border border-border rounded-lg opacity-60 cursor-not-allowed"
        >
          <Mic size={18} />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
