"use client";

import { useState } from "react";
import { User, Edit2 } from "lucide-react";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

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

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
            {initials || <User size={24} />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-dark">{profile.name}</h2>
            <p className="text-xs text-muted-foreground">Patient Profile</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary-dark hover:bg-muted px-2.5 py-1.5 rounded-lg border border-border transition-colors cursor-pointer"
        >
          <Edit2 size={13} />
          Edit Info
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border text-center">
        <div>
          <span className="block text-xs text-muted-foreground">Age</span>
          <span className="font-semibold text-foreground text-sm">{profile.age}</span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">DOB</span>
          <span className="font-semibold text-foreground text-sm">{profile.dob}</span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Gender</span>
          <span className="font-semibold text-foreground text-sm">{profile.gender}</span>
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
