"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
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
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-primary-dark">Current Medications</h3>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary-dark hover:bg-muted px-2.5 py-1.5 rounded-lg border border-border transition-colors cursor-pointer"
        >
          <Edit2 size={13} />
          Edit Info
        </button>
      </div>

      <div className="overflow-x-auto">
        {profile.medications.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">No current medications listed.</p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="font-medium pb-2">Medication</th>
                <th className="font-medium pb-2">Dosage</th>
                <th className="font-medium pb-2">Schedule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profile.medications.map((med, idx) => (
                <tr key={med.id || idx}>
                  <td className="py-2.5 font-semibold text-foreground">{med.name}</td>
                  <td className="py-2.5 text-foreground">{med.dosage}</td>
                  <td className="py-2.5 text-muted-foreground">{med.schedule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
