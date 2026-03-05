"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";

type DeactivateStatusModalProps = {
  open: boolean;
  onClose: () => void;
  statusId: string;
  statusLabel: string;
  onDeactivated?: (statusId: string) => void;
};

export function DeactivateStatusModal({ open, onClose, statusId, statusLabel, onDeactivated }: DeactivateStatusModalProps) {
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    setSubmitError("");
    onClose();
  };

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    const { error } = await supabase.from("ticket_statuses").update({ is_active: false }).eq("id", statusId);

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message || "Unable to deactivate status");
      return;
    }

    onDeactivated?.(statusId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate Status</DialogTitle>
          <DialogDescription>
            Are you sure you want to deactivate <span className="font-medium text-foreground">{statusLabel}</span>? It will no longer
            appear when setting status on tickets.
          </DialogDescription>
        </DialogHeader>

        {submitError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDeactivate} disabled={isSubmitting}>
            {isSubmitting ? "Deactivating..." : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
