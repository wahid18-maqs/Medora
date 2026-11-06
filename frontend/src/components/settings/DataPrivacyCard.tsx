"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, Trash2, AlertTriangle, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function DataPrivacyCard() {
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmEmailInput, setConfirmEmailInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExportData() {
    setExportError(null);
    setExporting(true);
    try {
      const blob = await api.exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "blood-test-analyser-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err?.message || "Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await api.deleteAccount();
      await logout();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const isEmailMatching =
    confirmEmailInput.trim().toLowerCase() === (user?.email || "").toLowerCase();

  return (
    <section className="py-6">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-foreground">Data &amp; Privacy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your health data exports and account deletion.
        </p>
      </div>

      <div className="divide-y divide-border">
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Export my data</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Download a JSON copy of all your analyzed reports and health profile records.
            </p>
            {exportError && (
              <p className="mt-2 text-xs font-medium text-destructive">{exportError}</p>
            )}
          </div>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={14} />
            {exporting ? "Preparing Export..." : "Export my data"}
          </button>
        </div>

        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-destructive">Danger zone</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Permanently delete your account and remove all reports and history from our database.
            </p>
          </div>

          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 size={14} />
            Delete my account
          </button>
        </div>
      </div>

      <Dialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={20} />
                <Dialog.Title className="text-base font-semibold text-foreground">
                  Confirm Account Deletion
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Description className="mb-4 text-xs leading-relaxed text-muted-foreground">
              This permanently deletes your reports and profile. This action cannot be undone.
              Please type your email{" "}
              <span className="font-semibold text-foreground">{user?.email}</span> to confirm
              deletion:
            </Dialog.Description>

            <input
              type="email"
              value={confirmEmailInput}
              onChange={(e) => setConfirmEmailInput(e.target.value)}
              placeholder={user?.email || "user@example.com"}
              className="mb-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40"
            />

            {deleteError && (
              <p className="mb-3 text-xs font-medium text-destructive">{deleteError}</p>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isEmailMatching || deleting}
                onClick={handleDeleteAccount}
                className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Permanently Delete Account"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
