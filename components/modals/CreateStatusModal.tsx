"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import type { TicketStatusRow } from "@/lib/useModal";

type StatusColor = TicketStatusRow["color"];

const STATUS_COLOR_OPTIONS: StatusColor[] = ["green", "amber", "red", "zinc", "blue"];

type CreateStatusModalProps = {
  open: boolean;
  onClose: () => void;
  statusId?: string;
  defaultLabel?: string;
  defaultColor?: StatusColor;
  onCreated?: (status: TicketStatusRow) => void;
  onUpdated?: (status: TicketStatusRow) => void;
};

export function CreateStatusModal({ open, onClose, statusId, defaultLabel, defaultColor, onCreated, onUpdated }: CreateStatusModalProps) {
  const [label, setLabel] = useState(defaultLabel ?? "");
  const [color, setColor] = useState<StatusColor>(defaultColor ?? "zinc");
  const [labelError, setLabelError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(statusId);

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

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setSubmitError("Unable to determine current user");
      setIsSubmitting(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile?.org_id) {
      setSubmitError("Unable to determine your organization");
      setIsSubmitting(false);
      return;
    }

    const statusPayload = {
      label: trimmedLabel,
      color,
    };

    const request = isEditing
      ? supabase
          .from("ticket_statuses")
          .update(statusPayload)
          .eq("id", statusId)
          .eq("org_id", profile.org_id)
          .select("id, org_id, label, color, sort_order, is_active, created_at")
          .single()
      : supabase
          .from("ticket_statuses")
          .insert({
            ...statusPayload,
            org_id: profile.org_id,
            sort_order: 0,
            is_active: true,
          })
          .select("id, org_id, label, color, sort_order, is_active, created_at")
          .single();

    const { data: savedStatus, error: saveError } = await request;

    setIsSubmitting(false);

    if (saveError) {
      if (saveError.code === "23505") {
        setSubmitError("A status with that label already exists");
      } else {
        setSubmitError(saveError.message || `Unable to ${isEditing ? "update" : "create"} status`);
      }
      return;
    }

    if (savedStatus) {
      const status = savedStatus as TicketStatusRow;

      if (isEditing) {
        onUpdated?.(status);
      } else {
        onCreated?.(status);
      }
    }

    setLabel(defaultLabel ?? "");
    setColor(defaultColor ?? "zinc");
    setSubmitError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Status" : "Create Status"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update status labels used in your team's ticket workflow." : "Create a status for your team's ticket workflow."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {submitError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="status-label">Label</Label>
            <Input id="status-label" value={label} onChange={(event) => setLabel(event.target.value)} />
            {labelError ? <p className="text-xs text-red-600">{labelError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-color">Color</Label>
            <select
              id="status-color"
              value={color}
              onChange={(event) => setColor(event.target.value as StatusColor)}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
            >
              {STATUS_COLOR_OPTIONS.map((colorOption) => (
                <option key={colorOption} value={colorOption}>
                  {colorOption[0].toUpperCase() + colorOption.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Changes" : "Create Status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
