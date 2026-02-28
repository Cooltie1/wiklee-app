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

type DeleteCategoryModalProps = {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  onDeleted?: (categoryId: string) => void;
};

export function DeleteCategoryModal({ open, onClose, categoryId, categoryName, onDeleted }: DeleteCategoryModalProps) {
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

    const { error: ticketUpdateError } = await supabase.from("tickets").update({ category_id: null }).eq("category_id", categoryId);

    if (ticketUpdateError) {
      setSubmitError(ticketUpdateError.message || "Unable to remove category from tickets");
      setIsSubmitting(false);
      return;
    }

    const { error: categoryDeleteError } = await supabase.from("ticket_categories").delete().eq("id", categoryId);

    setIsSubmitting(false);

    if (categoryDeleteError) {
      setSubmitError(categoryDeleteError.message || "Unable to delete category");
      return;
    }

    onDeleted?.(categoryId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogDescription>
            Deleting <span className="font-medium text-foreground">{categoryName}</span> will remove this category from any tickets that
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
