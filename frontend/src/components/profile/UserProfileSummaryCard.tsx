"use client";

import { useState } from "react";
import { User } from "lucide-react";
import CardEditButton from "./CardEditButton";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "Not set";
  const text = String(value).trim();
  return text && text !== "0" ? text : "Not set";
}

export default function UserProfileSummaryCard({
  profile,
  onUpdate,
}: {
  profile: HealthProfile;
  onUpdate: (updated: Partial<HealthProfile>) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const fields: FieldConfig[] = [
    { key: "name", label: "Full Name" },
    { key: "age", label: "Age", type: "number" },
    { key: "dob", label: "Date of Birth", type: "date" },
    { key: "gender", label: "Gender" },
  ];

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const age = displayValue(profile.age);
  const dob = displayValue(profile.dob);
  const gender = displayValue(profile.gender);

  return (
    <div className="flex h-full min-h-[240px] flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shadow-sm">
            {initials || <User size={28} />}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-primary-dark">
              {profile.name || "Not set"}
            </h2>
            <p className="text-[13px] text-muted-foreground">Patient Profile</p>
          </div>
        </div>
        <CardEditButton onClick={() => setIsEditing(true)} ariaLabel="Edit personal information" />
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
        <div>
          <span className="block text-xs text-muted-foreground">Age</span>
          <span
            className={`mt-1 block text-sm font-semibold ${
              age === "Not set" ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {age}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">DOB</span>
          <span
            className={`mt-1 block truncate text-sm font-semibold ${
              dob === "Not set" ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {dob}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Gender</span>
          <span
            className={`mt-1 block text-sm font-semibold ${
              gender === "Not set" ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {gender}
          </span>
        </div>
      </div>

      <EditableCardModal
        title="Personal Information"
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        fields={fields}
        initialValues={{
          name: profile.name,
          age: profile.age,
          dob: profile.dob,
          gender: profile.gender,
        }}
        onSave={async (vals) => {
          await onUpdate(vals);
        }}
      />
    </div>
  );
}
