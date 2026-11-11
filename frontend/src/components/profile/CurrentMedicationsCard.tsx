"use client";

import { useState } from "react";
import { Pill } from "lucide-react";
import CardEditButton from "./CardEditButton";
import CardEmptyState from "./CardEmptyState";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

export default function CurrentMedicationsCard({
  profile,
  onUpdate,
}: {
  profile: HealthProfile;
  onUpdate: (updated: Partial<HealthProfile>) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const fields: FieldConfig[] = [
    {
      key: "medicationsText",
      label: "Medications (format: Name | Dosage | Schedule per line)",
      type: "textarea",
      placeholder: "Vitamin D3 | 2000 IU | Daily morning",
    },
  ];

  const initialText = profile.medications
    .map((m) => `${m.name} | ${m.dosage} | ${m.schedule}`)
    .join("\n");

  return (
    <div className="flex h-full min-h-[240px] flex-col rounded-xl border border-border bg-card p-6 shadow-sm lg:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-primary-dark">Current Medications</h3>
        <CardEditButton onClick={() => setIsEditing(true)} ariaLabel="Edit current medications" />
      </div>

      {profile.medications.length === 0 ? (
        <CardEmptyState
          icon={Pill}
          message="No medications added yet."
          onAdd={() => setIsEditing(true)}
        />
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Medication</th>
                <th className="pb-2 font-medium">Dosage</th>
                <th className="pb-2 font-medium">Schedule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profile.medications.map((med, idx) => (
                <tr key={med.id || idx}>
                  <td className="py-3 font-semibold text-foreground">{med.name}</td>
                  <td className="py-3 text-foreground">{med.dosage}</td>
                  <td className="py-3 text-[13px] text-muted-foreground">{med.schedule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditableCardModal
        title="Current Medications"
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        fields={fields}
        initialValues={{ medicationsText: initialText }}
        onSave={async (vals) => {
          const parsed = (vals.medicationsText || "")
            .split("\n")
            .filter((l: string) => l.trim())
            .map((line: string, i: number) => {
              const [name, dosage, schedule] = line.split("|");
              return {
                id: String(i + 1),
                name: (name || "").trim(),
                dosage: (dosage || "").trim(),
                schedule: (schedule || "").trim(),
              };
            });

          await onUpdate({ medications: parsed });
        }}
      />
    </div>
  );
}
