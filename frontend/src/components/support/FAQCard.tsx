"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    id: "formats",
    question: "What file formats can I upload?",
    answer: "We currently support standard PDF blood test report documents (.pdf). Make sure the text is readable and unencrypted for accurate multi-agent AI analysis.",
  },
  {
    id: "retention",
    question: "How long is my report history kept?",
    answer: "Your analyzed reports are stored securely in your private history indefinitely until you explicitly delete individual reports or export/delete your account data.",
  },
  {
    id: "security",
    question: "Is my health data encrypted?",
    answer: "Yes, all transmission occurs over TLS/HTTPS, and health records are isolated strictly to your authenticated session token.",
  },
  {
    id: "deletion",
    question: "Can I delete my data?",
    answer: (
      <span>
        Yes, you have full control over your health records. You can export your data or permanently delete your account anytime on the{" "}
        <Link href="/dashboard/settings" className="font-medium text-primary underline hover:text-primary/80">
          Settings page
        </Link>
        .
      </span>
    ),
  },
  {
    id: "accuracy",
    question: "How accurate is the AI doctor analysis?",
    answer: "Our CrewAI multi-agent system uses specialized medical verifiers, doctors, nutritionists, and exercise agents to analyze markers against standard clinical ranges. Note that results are for informational summary purposes and should always be reviewed by a licensed healthcare provider.",
  },
];

export default function FAQCard() {
  const [openId, setOpenId] = useState<string | null>("formats");

  return (
    <section className="py-6 first:pt-0">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">Frequently Asked Questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick answers about reports, privacy, and security.
        </p>
      </div>

      <div className="divide-y divide-border">
        {FAQS.map((faq) => {
          const isOpen = openId === faq.id;
          const contentId = `faq-${faq.id}`;

          return (
            <div key={faq.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                aria-expanded={isOpen}
                aria-controls={contentId}
                className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "shrink-0 text-muted-foreground transition-transform duration-300",
                    isOpen && "rotate-180 text-primary"
                  )}
                />
              </button>

              <div
                id={contentId}
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="pb-4 pr-8 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
