"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export default function ContactSupportCard() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError("Please enter a subject line.");
      return;
    }

    if (message.trim().length < 10) {
      setError("Please enter a message of at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await api.submitSupportRequest({
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubmitted(true);
      setSubject("");
      setMessage("");
    } catch (err: any) {
      setError(err?.message || "Failed to send support request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="py-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">Contact Support</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Have a question or feedback? Send our team a message directly.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-xl border border-border bg-muted/50 p-6 text-center">
          <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
          <h3 className="mb-1 text-sm font-semibold text-foreground">Message received</h3>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Thank you for reaching out. We&apos;ve received your support request and will reply to{" "}
            <span className="font-medium text-foreground">{user?.email}</span> as soon as possible.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Your email address
            </label>
            <input
              type="email"
              readOnly
              value={user?.email || "user@example.com"}
              className="w-full cursor-not-allowed rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Subject <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Question about my report analysis"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Message <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={5}
              required
              placeholder="Describe your question or issue in detail (at least 10 characters)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Send size={14} />
              {submitting ? "Sending Message..." : "Submit Support Request"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
