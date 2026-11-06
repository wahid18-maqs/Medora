"use client";

import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import PageContainer from "@/components/layout/PageContainer";
import FAQCard from "@/components/support/FAQCard";
import ContactSupportCard from "@/components/support/ContactSupportCard";

export default function SupportPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeHref="/dashboard/support" />

      <PageContainer>
        <header className="mb-8">
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="transition-colors hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Support</span>
          </div>
          <h1 className="text-2xl font-semibold text-primary-dark">Help &amp; Support</h1>
        </header>

        <div className="divide-y divide-border">
          <FAQCard />
          <ContactSupportCard />
        </div>

        <footer className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p>
            Medora provides informational insights and does not replace professional medical
            advice.
          </p>
          <p className="mt-2">© 2026 Medora. All rights reserved.</p>
        </footer>
      </PageContainer>
    </div>
  );
}
