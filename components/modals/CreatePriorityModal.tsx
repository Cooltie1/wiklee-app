"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import type { TicketPriorityRow } from "@/lib/useModal";

type CreatePriorityModalProps = {
  open: boolean;
  onClose: () => void;
  priorityId?: string;
  defaultLabel?: string;
  onCreated?: (priority: TicketPriorityRow) => void;
  onUpdated?: (priority: TicketPriorityRow) => void;
};

export function CreatePriorityModal({
  open,
  onClose,
  priorityId,
  defaultLabel,
  onCreated,
  onUpdated,
}: CreatePriorityModalProps) {
  const [label, setLabel] = useState(defaultLabel ?? "");
  const [labelError, setLabelError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(priorityId);

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedLabel = label.trim();

    let hasError = false;
    setLabelError("");
    setSubmitError("");

    if (!trimmedLabel) {
      setLabelError("Label is required");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    const priorityPayload = {
      label: trimmedLabel,
    };

    const request = isEditing
      ? supabase.from("ticket_priorities").update(priorityPayload).eq("id", priorityId).select("id, label, sort_order, is_active, created_at").single()
      : supabase
          .from("ticket_priorities")
          .insert({
            ...priorityPayload,
            sort_order: 0,
            is_active: true,
          })
          .select("id, label, sort_order, is_active, created_at")
          .single();

    const { data: savedPriority, error: saveError } = await request;

    setIsSubmitting(false);

    if (saveError) {
      if (saveError.code === "23505") {
        setSubmitError("A priority with that label already exists");
      } else {
        setSubmitError(saveError.message || `Unable to ${isEditing ? "update" : "create"} priority`);
      }
      return;
    }

    if (savedPriority) {
      const priority = savedPriority as TicketPriorityRow;

      if (isEditing) {
        onUpdated?.(priority);
      } else {
        onCreated?.(priority);
      }
    }

    setLabel(defaultLabel ?? "");
    setSubmitError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Priority" : "Create Priority"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the priority label used to sort ticket urgency." : "Create a priority to sort ticket urgency."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {submitError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="priority-label">Label</Label>
            <Input id="priority-label" value={label} onChange={(event) => setLabel(event.target.value)} />
            {labelError ? <p className="text-xs text-red-600">{labelError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Changes" : "Create Priority"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
