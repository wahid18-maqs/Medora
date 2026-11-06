"use client";

import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import PageContainer from "@/components/layout/PageContainer";
import AccountCard from "@/components/settings/AccountCard";
import AppearanceSection from "@/components/settings/AppearanceSection";
import DataPrivacyCard from "@/components/settings/DataPrivacyCard";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeHref="/dashboard/settings" />

      <PageContainer>
        <header className="mb-8">
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="transition-colors hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Settings</span>
          </div>
          <h1 className="text-2xl font-semibold text-primary-dark">Settings</h1>
        </header>

        <div className="divide-y divide-border">
          <AccountCard />
          <AppearanceSection />
          <DataPrivacyCard />
        </div>
      </PageContainer>
    </div>
  );
}
