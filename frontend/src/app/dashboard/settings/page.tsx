"use client";

import Sidebar from "@/components/layout/Sidebar";
import PageContainer from "@/components/layout/PageContainer";
import AccountCard from "@/components/settings/AccountCard";
import AppearanceSection from "@/components/settings/AppearanceSection";
import DataPrivacyCard from "@/components/settings/DataPrivacyCard";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeHref="/dashboard/settings" />

      <PageContainer width="full" className="mx-auto max-w-[1600px]">
        <header className="mb-8">
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
