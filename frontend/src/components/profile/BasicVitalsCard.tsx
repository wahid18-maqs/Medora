"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

export default function BasicVitalsCard({
  profile,
  onUpdate,
}: {
  profile: HealthProfile;
  onUpdate: (updated: Partial<HealthProfile>) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const vitals = profile.vitals;

  // Compute BMI dynamically from weight (kg) and height (cm)
  const weightKg = Number(vitals.weight) || 0;
  const heightM = (Number(vitals.height) || 0) / 100;
  const computedBMI = heightM > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : "--";

  const fields: FieldConfig[] = [
    { key: "weight", label: "Weight (kg)", type: "number" },
    { key: "height", label: "Height (cm)", type: "number" },
    { key: "bloodType", label: "Blood Type" },
    { key: "systolicBP", label: "Systolic BP (mmHg)", type: "number" },
    { key: "diastolicBP", label: "Diastolic BP (mmHg)", type: "number" },
    { key: "restingHeartRate", label: "Resting Heart Rate (bpm)", type: "number" },
  ];

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-primary-dark">Basic Vitals</h3>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary-dark hover:bg-muted px-2.5 py-1.5 rounded-lg border border-border transition-colors cursor-pointer"
        >
          <Edit2 size={13} />
          Edit Info
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted p-3 rounded-lg border border-border">
          <span className="block text-xs text-muted-foreground">Weight & Height</span>
          <span className="text-sm font-semibold text-foreground">
            {vitals.weight} kg / {vitals.height} cm
          </span>
        </div>

        <div className="bg-muted p-3 rounded-lg border border-border">
          <span className="block text-xs text-muted-foreground">Computed BMI</span>
          <span className="text-sm font-semibold text-primary-dark">{computedBMI} kg/m²</span>
        </div>

        <div className="bg-muted p-3 rounded-lg border border-border">
          <span className="block text-xs text-muted-foreground">Blood Pressure</span>
          <span className="text-sm font-semibold text-foreground">
            {vitals.systolicBP}/{vitals.diastolicBP} mmHg
          </span>
        </div>

        <div className="bg-muted p-3 rounded-lg border border-border">
          <span className="block text-xs text-muted-foreground">Blood Type & Heart Rate</span>
          <span className="text-sm font-semibold text-foreground">
            {vitals.bloodType} | {vitals.restingHeartRate} bpm
          </span>
        </div>
      </div>

      <EditableCardModal
        title="Basic Vitals"
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        fields={fields}
        initialValues={{
          weight: vitals.weight,
          height: vitals.height,
          bloodType: vitals.bloodType,
          systolicBP: vitals.systolicBP,
          diastolicBP: vitals.diastolicBP,
          restingHeartRate: vitals.restingHeartRate,
        }}
        onSave={async (vals) => {
          await onUpdate({
            vitals: {
              weight: Number(vals.weight),
              height: Number(vals.height),
              bloodType: vals.bloodType,
              systolicBP: Number(vals.systolicBP),
              diastolicBP: Number(vals.diastolicBP),
              restingHeartRate: Number(vals.restingHeartRate),
            },
          });
        }}
      />
    </div>
  );
}
