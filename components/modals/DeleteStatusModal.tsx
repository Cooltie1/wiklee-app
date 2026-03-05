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

type DeleteStatusModalProps = {
  open: boolean;
  onClose: () => void;
  statusId: string;
  statusLabel: string;
  onDeleted?: (statusId: string) => void;
};

export function DeleteStatusModal({ open, onClose, statusId, statusLabel, onDeleted }: DeleteStatusModalProps) {
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    setSubmitError("");
    onClose();
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    const { error: ticketUpdateError } = await supabase.from("tickets").update({ status_id: null }).eq("status_id", statusId);

    if (ticketUpdateError) {
      setSubmitError(ticketUpdateError.message || "Unable to remove status from tickets");
      setIsSubmitting(false);
      return;
    }

    const { error: statusDeleteError } = await supabase.from("ticket_statuses").delete().eq("id", statusId);

    setIsSubmitting(false);

    if (statusDeleteError) {
      setSubmitError(statusDeleteError.message || "Unable to delete status");
      return;
    }

    onDeleted?.(statusId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Status</DialogTitle>
          <DialogDescription>
            Deleting <span className="font-medium text-foreground">{statusLabel}</span> will remove this status from any tickets that
            currently use it. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {submitError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
            {isSubmitting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
