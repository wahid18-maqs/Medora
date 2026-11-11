"use client";

import { X, Bot, Sparkles, ChevronRight } from "lucide-react";
import ReportChat from "@/components/analysis/ReportChat";
import type { Marker } from "@/lib/types";

interface ContextualChatPanelProps {
  reportId: string;
  markers?: Marker[];
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

export default function ContextualChatPanel({
  reportId,
  markers = [],
  isOpen,
  onClose,
}: ContextualChatPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Desktop: sticky right column. Mobile: full-screen overlay. */}
      <div className="fixed left-0 top-0 z-50 h-dvh w-full lg:sticky lg:left-auto lg:top-0 lg:z-30 lg:h-dvh lg:w-[360px] lg:shrink-0 xl:w-[400px] print:hidden">
        {/* Collapse toggle button on the left edge (matches sidebar collapse pattern) */}
        <button
          onClick={onClose}
          title="Collapse assistant"
          className="absolute -left-3 top-7 z-40 hidden h-6 w-6 rounded-full border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:border-primary/40 hover:text-primary lg:flex items-center justify-center cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>

        <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border bg-card shadow-xl print:hidden">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  Report Assistant
                  <Sparkles size={13} className="text-amber-500 fill-amber-500" />
                </h3>
                <p className="text-xs text-muted-foreground">
                  Grounded strictly in your report findings
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              title="Close assistant"
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Embedded chat container */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <ReportChat reportId={reportId} markers={markers} />
          </div>
        </aside>
      </div>
    </>
  );
}
