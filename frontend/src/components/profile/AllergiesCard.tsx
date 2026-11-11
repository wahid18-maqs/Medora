"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import CardEditButton from "./CardEditButton";
import CardEmptyState from "./CardEmptyState";
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
    <div className="flex h-full min-h-[240px] flex-col rounded-xl border border-border bg-card p-6 shadow-sm lg:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-primary-dark">Allergies</h3>
        <CardEditButton onClick={() => setIsEditing(true)} ariaLabel="Edit allergies" />
      </div>

      {profile.allergies.length === 0 ? (
        <CardEmptyState
          icon={ShieldAlert}
          message="No allergies added yet."
          onAdd={() => setIsEditing(true)}
        />
      ) : (
        <ul className="flex flex-1 flex-col gap-2.5">
          {profile.allergies.map((allergy, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
              <span>{allergy}</span>
            </li>
          ))}
        </ul>
      )}

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
