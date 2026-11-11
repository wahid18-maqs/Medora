"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import CardEditButton from "./CardEditButton";
import CardEmptyState from "./CardEmptyState";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

export default function MedicalHistoryCard({
  profile,
  onUpdate,
}: {
  profile: HealthProfile;
  onUpdate: (updated: Partial<HealthProfile>) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const fields: FieldConfig[] = [
    {
      key: "conditionsText",
      label: "Medical Conditions (format: Name | Notes per line)",
      type: "textarea",
      placeholder: "Mild Seasonal Allergies | Managed with OTC antihistamines",
    },
    {
      key: "surgeriesText",
      label: "Surgical History (format: Procedure | YYYY-MM-DD per line)",
      type: "textarea",
      placeholder: "Appendectomy | 2018-09-12",
    },
  ];

  const initialConditionsText = profile.medicalConditions
    .map((c) => `${c.name} | ${c.notes}`)
    .join("\n");
  const initialSurgeriesText = profile.surgeries
    .map((s) => `${s.procedure} | ${s.date}`)
    .join("\n");

  const hasHistory = profile.medicalConditions.length > 0 || profile.surgeries.length > 0;

  return (
    <div className="flex h-full min-h-[240px] flex-col rounded-xl border border-border bg-card p-6 shadow-sm lg:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-primary-dark">Medical History</h3>
        <CardEditButton onClick={() => setIsEditing(true)} ariaLabel="Edit medical history" />
      </div>

      {!hasHistory ? (
        <CardEmptyState
          icon={ClipboardList}
          message="No medical history added yet."
          onAdd={() => setIsEditing(true)}
        />
      ) : (
        <div className="flex-1 space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active / Past Conditions
            </h4>
            {profile.medicalConditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded.</p>
            ) : (
              <div className="space-y-2">
                {profile.medicalConditions.map((cond, idx) => (
                  <div
                    key={cond.id || idx}
                    className="flex flex-col justify-between gap-1 rounded-lg bg-muted px-3 py-2.5 sm:flex-row sm:items-center"
                  >
                    <span className="text-sm font-semibold text-foreground">{cond.name}</span>
                    <span className="text-[13px] text-muted-foreground">{cond.notes}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Surgical History
            </h4>
            {profile.surgeries.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded.</p>
            ) : (
              <div className="space-y-2">
                {profile.surgeries.map((surg, idx) => (
                  <div
                    key={surg.id || idx}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5"
                  >
                    <span className="text-sm font-semibold text-foreground">{surg.procedure}</span>
                    <span className="text-[13px] text-muted-foreground">{surg.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <EditableCardModal
        title="Medical History"
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        fields={fields}
        initialValues={{
          conditionsText: initialConditionsText,
          surgeriesText: initialSurgeriesText,
        }}
        onSave={async (vals) => {
          const parsedConditions = (vals.conditionsText || "")
            .split("\n")
            .filter((l: string) => l.trim())
            .map((line: string, i: number) => {
              const [name, ...notesArr] = line.split("|");
              return {
                id: String(i + 1),
                name: (name || "").trim(),
                notes: notesArr.join("|").trim(),
              };
            });

          const parsedSurgeries = (vals.surgeriesText || "")
            .split("\n")
            .filter((l: string) => l.trim())
            .map((line: string, i: number) => {
              const [proc, date] = line.split("|");
              return {
                id: String(i + 1),
                procedure: (proc || "").trim(),
                date: (date || "").trim(),
              };
            });

          await onUpdate({
            medicalConditions: parsedConditions,
            surgeries: parsedSurgeries,
          });
        }}
      />
    </div>
  );
}
