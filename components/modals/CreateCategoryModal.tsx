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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import type { TicketCategoryRow } from "@/lib/useModal";

type CreateCategoryModalProps = {
  open: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultDescription?: string;
  defaultColor?: string;
  onCreated?: (category: TicketCategoryRow) => void;
};

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function CreateCategoryModal({
  open,
  onClose,
  defaultName,
  defaultDescription,
  defaultColor,
  onCreated,
}: CreateCategoryModalProps) {
  const [name, setName] = useState(defaultName ?? "");
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    let hasError = false;
    setNameError("");
    setSubmitError("");

    if (!trimmedName) {
      setNameError("Name is required");
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

    const { data: created, error: insertError } = await supabase
      .from("ticket_categories")
      .insert({
        org_id: profile.org_id,
        name: trimmedName,
        description: normalizeOptional(description),
        color: normalizeOptional(defaultColor ?? ""),
        sort_order: 0,
      })
      .select("id, org_id, name, description, color, sort_order, created_at")
      .single();

    setIsSubmitting(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setSubmitError("A category with that name already exists");
      } else {
        setSubmitError(insertError.message || "Unable to create category");
      }
      return;
    }

    if (created) {
      onCreated?.(created as TicketCategoryRow);
    }

    setName(defaultName ?? "");
    setDescription(defaultDescription ?? "");
    setSubmitError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>Create a category to organize tickets for your team.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {submitError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} />
            {nameError ? <p className="text-xs text-red-600">{nameError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
