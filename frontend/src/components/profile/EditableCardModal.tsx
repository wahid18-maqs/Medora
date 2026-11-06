"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea";
  placeholder?: string;
}

export default function EditableCardModal({
  title,
  isOpen,
  onClose,
  fields,
  initialValues,
  onSave,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  fields: FieldConfig[];
  initialValues: Record<string, any>;
  onSave: (values: Record<string, any>) => Promise<void> | void;
}) {
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormState({ ...initialValues });
    }
  }, [isOpen, initialValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formState);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl shadow-xl border border-border p-6 z-50 focus:outline-none">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-primary-dark">
              Edit {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground rounded-md p-1 cursor-pointer">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={formState[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={formState[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary rounded-lg cursor-pointer disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
