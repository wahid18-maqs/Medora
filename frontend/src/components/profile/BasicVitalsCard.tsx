"use client";

import { useState } from "react";
import CardEditButton from "./CardEditButton";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

function VitalTile({
  label,
  value,
  fallback = "Not set",
}: {
  label: string;
  value: string;
  fallback?: string;
}) {
  const isEmpty = value === fallback;

  return (
    <div className="flex min-h-[104px] flex-col justify-between rounded-xl border border-border bg-muted p-4">
      <span className="text-[13px] leading-snug text-muted-foreground">{label}</span>
      <span
        className={`mt-3 text-xl font-bold leading-tight ${
          isEmpty ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function BasicVitalsCard({
  profile,
  onUpdate,
}: {
  profile: HealthProfile;
  onUpdate: (updated: Partial<HealthProfile>) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const vitals = profile.vitals;
  const weightKg = Number(vitals.weight) || 0;
  const heightCm = Number(vitals.height) || 0;
  const heightM = heightCm / 100;
  const systolicBP = Number(vitals.systolicBP) || 0;
  const diastolicBP = Number(vitals.diastolicBP) || 0;
  const heartRate = Number(vitals.restingHeartRate) || 0;

  const computedBMI =
    heightM > 0 && weightKg > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : null;

  const weightHeight =
    weightKg > 0 || heightCm > 0
      ? `${weightKg > 0 ? `${weightKg} kg` : "Not set"} / ${
          heightCm > 0 ? `${heightCm} cm` : "Not set"
        }`
      : "Not set";

  const bloodPressure =
    systolicBP > 0 || diastolicBP > 0
      ? `${systolicBP > 0 ? systolicBP : "--"}/${diastolicBP > 0 ? diastolicBP : "--"} mmHg`
      : "Not set";

  const bloodTypeHeartRate =
    (vitals.bloodType || "").trim() || heartRate > 0
      ? `${(vitals.bloodType || "").trim() || "Not set"} | ${heartRate > 0 ? `${heartRate} bpm` : "Not set"}`
      : "Not set";

  const fields: FieldConfig[] = [
    { key: "weight", label: "Weight (kg)", type: "number" },
    { key: "height", label: "Height (cm)", type: "number" },
    { key: "bloodType", label: "Blood Type" },
    { key: "systolicBP", label: "Systolic BP (mmHg)", type: "number" },
    { key: "diastolicBP", label: "Diastolic BP (mmHg)", type: "number" },
    { key: "restingHeartRate", label: "Resting Heart Rate (bpm)", type: "number" },
  ];

  return (
    <div className="flex h-full min-h-[240px] flex-col rounded-xl border border-border bg-card p-6 shadow-sm lg:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-primary-dark">Basic Vitals</h3>
        <CardEditButton onClick={() => setIsEditing(true)} ariaLabel="Edit basic vitals" />
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4">
        <VitalTile label="Weight & Height" value={weightHeight} />
        <VitalTile
          label="Computed BMI"
          value={computedBMI ? `${computedBMI} kg/m²` : "--"}
          fallback="--"
        />
        <VitalTile label="Blood Pressure" value={bloodPressure} />
        <VitalTile label="Blood Type & Heart Rate" value={bloodTypeHeartRate} />
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
