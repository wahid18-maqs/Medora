"use client";

import { useState } from "react";
import { Mail, Phone, Shield, ShieldAlert } from "lucide-react";
import CardEditButton from "./CardEditButton";
import EditableCardModal, { FieldConfig } from "./EditableCardModal";
import type { HealthProfile } from "@/lib/types";

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "Not provided";
  const text = String(value).trim();
  return text || "Not provided";
}

export default function ContactInsuranceCard({
  profile,
  onUpdate,
}: {
  profile: HealthProfile;
  onUpdate: (updated: Partial<HealthProfile>) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const fields: FieldConfig[] = [
    { key: "phone", label: "Phone Number" },
    { key: "email", label: "Email Address" },
    { key: "emergencyName", label: "Emergency Contact Name" },
    { key: "emergencyPhone", label: "Emergency Contact Phone" },
    { key: "insuranceProvider", label: "Insurance Provider" },
    { key: "insuranceMemberId", label: "Member ID" },
  ];

  const phone = displayValue(profile.phone);
  const email = displayValue(profile.email);
  const emergencyName = displayValue(profile.emergencyContact.name);
  const emergencyPhone = String(profile.emergencyContact.phone || "").trim();
  const insuranceProvider = displayValue(profile.insurance.provider);
  const insuranceMemberId = displayValue(profile.insurance.memberId);

  return (
    <div className="flex h-full min-h-[240px] flex-col rounded-xl border border-border bg-card p-6 shadow-sm lg:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-primary-dark">Contact &amp; Insurance</h3>
        <CardEditButton onClick={() => setIsEditing(true)} ariaLabel="Edit contact and insurance" />
      </div>

      <div className="flex-1 space-y-4 text-sm">
        <div className="flex items-center gap-2.5">
          <Phone size={16} className="shrink-0 text-muted-foreground" />
          <span className={phone === "Not provided" ? "text-muted-foreground" : "text-foreground"}>
            {phone === "Not provided" ? "Add phone number" : phone}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Mail size={16} className="shrink-0 text-muted-foreground" />
          <span
            className={`truncate ${
              email === "Not provided" ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {email}
          </span>
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldAlert size={14} className="text-destructive" />
            <span>Emergency Contact</span>
          </div>
          {emergencyName === "Not provided" ? (
            <p className="text-sm font-semibold text-muted-foreground">
              {emergencyPhone || "Not provided"}
            </p>
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {emergencyName}
              {emergencyPhone && (
                <span className="ml-1 font-normal text-muted-foreground">({emergencyPhone})</span>
              )}
            </p>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Shield size={14} className="text-primary" />
            <span>Insurance</span>
          </div>
          <p
            className={`text-sm font-semibold ${
              insuranceProvider === "Not provided" ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {insuranceProvider}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            ID: {insuranceMemberId}
          </p>
        </div>
      </div>

      <EditableCardModal
        title="Contact & Insurance"
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        fields={fields}
        initialValues={{
          phone: profile.phone,
          email: profile.email,
          emergencyName: profile.emergencyContact.name,
          emergencyPhone: profile.emergencyContact.phone,
          insuranceProvider: profile.insurance.provider,
          insuranceMemberId: profile.insurance.memberId,
        }}
        onSave={async (vals) => {
          await onUpdate({
            phone: vals.phone,
            email: vals.email,
            emergencyContact: {
              name: vals.emergencyName,
              phone: vals.emergencyPhone,
            },
            insurance: {
              provider: vals.insuranceProvider,
              memberId: vals.insuranceMemberId,
            },
          });
        }}
      />
    </div>
  );
}
