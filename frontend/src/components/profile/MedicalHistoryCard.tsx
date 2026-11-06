"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
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

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-primary-dark">Medical History</h3>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary-dark hover:bg-muted px-2.5 py-1.5 rounded-lg border border-border transition-colors cursor-pointer"
        >
          <Edit2 size={13} />
          Edit Info
        </button>
      </div>

      <div className="space-y-4">
        {/* Conditions Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Active / Past Conditions
          </h4>
          {profile.medicalConditions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No medical conditions recorded.</p>
          ) : (
            <div className="space-y-1.5">
              {profile.medicalConditions.map((cond, idx) => (
                <div
                  key={cond.id || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted px-3 py-2 rounded-lg text-xs"
                >
                  <span className="font-semibold text-foreground">{cond.name}</span>
                  <span className="text-muted-foreground">{cond.notes}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Surgical History Section */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Surgical History
          </h4>
          {profile.surgeries.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No surgical history recorded.</p>
          ) : (
            <div className="space-y-1.5">
              {profile.surgeries.map((surg, idx) => (
                <div
                  key={surg.id || idx}
                  className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg text-xs"
                >
                  <span className="font-semibold text-foreground">{surg.procedure}</span>
                  <span className="text-muted-foreground">{surg.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
