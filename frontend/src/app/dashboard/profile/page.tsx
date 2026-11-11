"use client";

import Sidebar from "@/components/layout/Sidebar";
import UserProfileSummaryCard from "@/components/profile/UserProfileSummaryCard";
import ContactInsuranceCard from "@/components/profile/ContactInsuranceCard";
import BasicVitalsCard from "@/components/profile/BasicVitalsCard";
import MedicalHistoryCard from "@/components/profile/MedicalHistoryCard";
import CurrentMedicationsCard from "@/components/profile/CurrentMedicationsCard";
import AllergiesCard from "@/components/profile/AllergiesCard";
import VaccinationsCard from "@/components/profile/VaccinationsCard";
import BiomarkerTrendsCard from "@/components/profile/BiomarkerTrendsCard";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { useHistory } from "@/hooks/useHistory";
import type { HistoryItem } from "@/lib/types";

export default function HealthProfilePage() {
  const { profile, updateProfile, isLoading, isError } = useHealthProfile();
  const { data: historyData } = useHistory({ page: 1, pageSize: 50 });

  const historyItems: HistoryItem[] = historyData?.items ?? [];
  const handleUpdate = async (updated: Parameters<typeof updateProfile>[0]) => {
    await updateProfile(updated);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeHref="/dashboard/profile" />

      <main className="min-w-0 flex-1 py-8">
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold text-primary-dark">Health Profile</h1>
          </header>

          {!profile ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {isLoading
                ? "Loading profile..."
                : isError
                  ? "Failed to load profile."
                  : "No profile found."}
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
              <UserProfileSummaryCard profile={profile} onUpdate={handleUpdate} />
              <ContactInsuranceCard profile={profile} onUpdate={handleUpdate} />
              <BasicVitalsCard profile={profile} onUpdate={handleUpdate} />
              <MedicalHistoryCard profile={profile} onUpdate={handleUpdate} />
              <CurrentMedicationsCard profile={profile} onUpdate={handleUpdate} />
              <AllergiesCard profile={profile} onUpdate={handleUpdate} />
              <VaccinationsCard profile={profile} onUpdate={handleUpdate} />
              <BiomarkerTrendsCard history={historyItems} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
