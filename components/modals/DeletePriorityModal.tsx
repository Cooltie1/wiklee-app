"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";

type DeletePriorityModalProps = {
  open: boolean;
  onClose: () => void;
  priorityId: string;
  priorityLabel: string;
  onDeleted?: (priorityId: string) => void;
};

export function DeletePriorityModal({ open, onClose, priorityId, priorityLabel, onDeleted }: DeletePriorityModalProps) {
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

    const { error: ticketUpdateError } = await supabase.from("tickets").update({ priority_id: null }).eq("priority_id", priorityId);

    if (ticketUpdateError) {
      setSubmitError(ticketUpdateError.message || "Unable to remove priority from tickets");
      setIsSubmitting(false);
      return;
    }

    const { error: priorityDeleteError } = await supabase.from("ticket_priorities").delete().eq("id", priorityId);

    setIsSubmitting(false);

    if (priorityDeleteError) {
      setSubmitError(priorityDeleteError.message || "Unable to delete priority");
      return;
    }

    onDeleted?.(priorityId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Priority</DialogTitle>
          <DialogDescription>
            Deleting <span className="font-medium text-foreground">{priorityLabel}</span> will remove this priority from any tickets that
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
