"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

export default function AllergiesCard({
  profile,
  onUpdate,
}: {
  profile: HealthProfile;
  onUpdate: (updated: Partial<HealthProfile>) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const fields: FieldConfig[] = [
    {
      key: "allergiesText",
      label: "Allergies (comma separated)",
      type: "textarea",
      placeholder: "Penicillin, Dust Mites, Peanuts",
    },
  ];

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-primary-dark">Allergies</h3>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-muted-foreground hover:text-primary-dark hover:bg-muted rounded-lg transition-colors cursor-pointer"
          title="Edit Allergies"
        >
          <Edit2 size={15} />
        </button>
      </div>

      <div>
        {profile.allergies.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No known allergies.</p>
        ) : (
          <ul className="space-y-2">
            {profile.allergies.map((allergy, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span>{allergy}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditableCardModal
        title="Allergies"
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        fields={fields}
        initialValues={{ allergiesText: profile.allergies.join(", ") }}
        onSave={async (vals) => {
          const parsed = (vals.allergiesText || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);

          await onUpdate({ allergies: parsed });
        }}
      />
    </div>
  );
}
