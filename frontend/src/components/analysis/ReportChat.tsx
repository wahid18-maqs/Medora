"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Mic, RefreshCw, Loader2, Bot, User } from "lucide-react";
import { useReportChat } from "@/hooks/useReportChat";

interface ReportChatProps {
  reportId: string;
}

export default function ReportChat({ reportId }: ReportChatProps) {
  const { messages, isLoading, isError, sendMessage, isSending } = useReportChat(reportId);
  const [inputText, setInputText] = useState("");
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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
    <div className="flex flex-col h-[400px] border border-slate-200 rounded-xl bg-card overflow-hidden">
      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-2">
            <Loader2 className="animate-spin" size={18} />
            <span>Loading conversation...</span>
          </div>
        )}

        {isError && (
          <div className="text-center text-sm text-red-500 py-4">
            Failed to load chat history. Please try refreshing.
          </div>
        )}

        {!isLoading && !isError && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm text-center px-4">
            <Bot size={32} className="mb-2 text-slate-300" />
            <p className="font-medium text-slate-600">Have questions about this report?</p>
            <p className="text-xs text-slate-400 mt-1">
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
                    ? "bg-primary text-white rounded-tr-none"
                    : "bg-slate-100 text-slate-800 border border-slate-200/60 rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.timestamp && (
                  <span
                    className={`block text-[10px] mt-1 ${
                      isUser ? "text-slate-200 text-right" : "text-slate-400"
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
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
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
            <div className="bg-slate-100 text-slate-500 border border-slate-200/60 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1.5 text-xs">
              <Loader2 className="animate-spin" size={14} />
              <span>Analyzing report & thinking...</span>
            </div>
          </div>
        )}

        {failedMessage && (
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-red-500 flex items-center gap-1">
              <span>Message failed to send</span>
              <button
                type="button"
                onClick={() => handleSend(failedMessage)}
                className="underline hover:text-red-700 font-medium flex items-center gap-0.5 cursor-pointer ml-1"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Field Area - Fixed at bottom of chat tab container */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question about this report..."
            disabled={isSending}
            className="w-full bg-card border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
        </div>

        {/* Disabled Voice Mic Trigger */}
        <button
          type="button"
          disabled
          title="Voice input coming soon"
          className="p-2 text-slate-400 bg-slate-100 border border-slate-200 rounded-lg opacity-60 cursor-not-allowed"
        >
          <Mic size={18} />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
