"use client";

import { useState } from "react";
import { Syringe } from "lucide-react";
import CardEditButton from "./CardEditButton";
import CardEmptyState from "./CardEmptyState";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

export default function VaccinationsCard({
  profile,
  onUpdate,
}: {
  profile: HealthProfile;
  onUpdate: (updated: Partial<HealthProfile>) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const fields: FieldConfig[] = [
    {
      key: "vaccinationsText",
      label: "Vaccinations (format: Name | YYYY-MM-DD per line)",
      type: "textarea",
      placeholder: "COVID-19 Booster | 2023-10-15",
    },
  ];

  const initialText = profile.vaccinations
    .map((v) => `${v.name} | ${v.date}`)
    .join("\n");

  return (
    <div className="flex h-full min-h-[240px] flex-col rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2 xl:col-span-3 lg:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-primary-dark">Vaccinations</h3>
        <CardEditButton onClick={() => setIsEditing(true)} ariaLabel="Edit vaccinations" />
      </div>

      {profile.vaccinations.length === 0 ? (
        <CardEmptyState
          icon={Syringe}
          message="No vaccinations added yet."
          onAdd={() => setIsEditing(true)}
        />
      ) : (
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {profile.vaccinations.map((vac, idx) => (
            <div
              key={vac.id || idx}
              className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-muted p-4"
            >
              <span className="text-sm font-semibold text-foreground">{vac.name}</span>
              <span className="font-mono text-[13px] text-muted-foreground">{vac.date}</span>
            </div>
          ))}
        </div>
      )}

      <EditableCardModal
        title="Vaccinations"
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        fields={fields}
        initialValues={{ vaccinationsText: initialText }}
        onSave={async (vals) => {
          const parsed = (vals.vaccinationsText || "")
            .split("\n")
            .filter((l: string) => l.trim())
            .map((line: string, i: number) => {
              const [name, date] = line.split("|");
              return {
                id: String(i + 1),
                name: (name || "").trim(),
                date: (date || "").trim(),
              };
            });

          await onUpdate({ vaccinations: parsed });
        }}
      />
    </div>
  );
}
