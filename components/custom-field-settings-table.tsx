"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeRole } from "@/lib/roles";
import { supabase } from "@/lib/supabaseClient";
import { type TicketFieldDefinition, type TicketFieldType } from "@/lib/ticketCustomFields";

type EditableField = TicketFieldDefinition & {
  config: Record<string, unknown> | null;
};

type FieldFormState = {
  id: string | null;
  key: string;
  label: string;
  field_type: TicketFieldType;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  optionsText: string;
  placeholder: string;
};

const FIELD_TYPE_OPTIONS: TicketFieldType[] = ["text", "textarea", "select", "number", "boolean", "date", "datetime", "multi_select"];

function toFieldFormState(field?: EditableField): FieldFormState {
  const options = Array.isArray(field?.config?.options)
    ? field?.config?.options
        .map((option) => {
          if (typeof option === "string") return option;
          if (option && typeof option === "object" && typeof (option as { label?: unknown }).label === "string") {
            return (option as { label: string }).label;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n")
    : "";

  return {
    id: field?.id ?? null,
    key: field?.key ?? "",
    label: field?.label ?? "",
    field_type: field?.field_type ?? "text",
    is_required: field?.is_required ?? false,
    is_active: field?.is_active ?? true,
    sort_order: field?.sort_order ?? 1,
    optionsText: options,
    placeholder: typeof field?.config?.placeholder === "string" ? field.config.placeholder : "",
  };
}

function buildConfig(formState: FieldFormState) {
  const config: Record<string, unknown> = {};

  if (formState.placeholder.trim()) {
    config.placeholder = formState.placeholder.trim();
  }

  if (formState.field_type === "select" || formState.field_type === "multi_select") {
    const optionLines = formState.optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    config.options = optionLines.map((label) => ({
      label,
      value: label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""),
    }));
  }

  return Object.keys(config).length ? config : null;
}

export function CustomFieldSettingsTable() {
  const [fields, setFields] = useState<EditableField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [canEditSettings, setCanEditSettings] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FieldFormState>(toFieldFormState());

  useEffect(() => {
    let isMounted = true;

    async function loadFields() {
      setIsLoading(true);
      setErrorMessage("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        if (isMounted) {
          setErrorMessage("Unable to determine current user");
          setIsLoading(false);
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id, role")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile?.org_id) {
        if (isMounted) {
          setErrorMessage("Unable to determine your organization");
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("ticket_field_definitions")
        .select("id, org_id, key, label, field_type, is_required, is_active, sort_order, config, created_at")
        .eq("org_id", profile.org_id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setErrorMessage(error.message || "Unable to load custom fields");
        setIsLoading(false);
        return;
      }

      setOrgId(profile.org_id);
      setCanEditSettings(normalizeRole(profile.role) === "admin");
      setFields((data ?? []) as EditableField[]);
      setIsLoading(false);
    }

    void loadFields();

    return () => {
      isMounted = false;
    };
  }, []);

  const isEditing = formState.id !== null;

  const sortedFields = useMemo(
    () =>
      [...fields].sort((a, b) => {
        const orderDiff = (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER);
        if (orderDiff !== 0) return orderDiff;
        return a.label.localeCompare(b.label);
      }),
    [fields]
  );

  const openCreateDialog = () => {
    const maxSort = Math.max(0, ...fields.map((field) => field.sort_order ?? 0));
    setFormState({ ...toFieldFormState(), sort_order: maxSort + 1 });
    setIsDialogOpen(true);
  };

  const openEditDialog = (field: EditableField) => {
    setFormState(toFieldFormState(field));
    setIsDialogOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEditSettings) {
      setErrorMessage("This section is read-only for agents.");
      return;
    }

    if (!orgId) {
      setErrorMessage("Unable to determine your organization");
      return;
    }

    if (!formState.label.trim() || !formState.key.trim()) {
      setErrorMessage("Label and key are required.");
      return;
    }

    const payload = {
      org_id: orgId,
      key: formState.key.trim().toLowerCase(),
      label: formState.label.trim(),
      field_type: formState.field_type,
      is_required: formState.is_required,
      is_active: formState.is_active,
      sort_order: formState.sort_order,
      config: buildConfig(formState),
    };

    setIsSaving(true);
    setErrorMessage("");

    if (formState.id) {
      const { data, error } = await supabase
        .from("ticket_field_definitions")
        .update(payload)
        .eq("id", formState.id)
        .eq("org_id", orgId)
        .select("id, org_id, key, label, field_type, is_required, is_active, sort_order, config, created_at")
        .single();

      setIsSaving(false);

      if (error || !data) {
        setErrorMessage(error?.message || "Unable to update custom field");
        return;
      }

      setFields((current) => current.map((field) => (field.id === data.id ? (data as EditableField) : field)));
      setIsDialogOpen(false);
      return;
    }

    const { data, error } = await supabase
      .from("ticket_field_definitions")
      .insert(payload)
      .select("id, org_id, key, label, field_type, is_required, is_active, sort_order, config, created_at")
      .single();

    setIsSaving(false);

    if (error || !data) {
      setErrorMessage(error?.message || "Unable to create custom field");
      return;
    }

    setFields((current) => [...current, data as EditableField]);
    setIsDialogOpen(false);
  };

  const handleToggleActive = async (field: EditableField) => {
    if (!canEditSettings) {
      setErrorMessage("This section is read-only for agents.");
      return;
    }

    if (!orgId) {
      setErrorMessage("Unable to determine your organization");
      return;
    }

    const nextActive = !field.is_active;

    const { error } = await supabase
      .from("ticket_field_definitions")
      .update({ is_active: nextActive })
      .eq("id", field.id)
      .eq("org_id", orgId);

    if (error) {
      setErrorMessage(error.message || "Unable to update field status");
      return;
    }

    setFields((current) => current.map((existing) => (existing.id === field.id ? { ...existing, is_active: nextActive } : existing)));
  };

  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Custom Fields</h1>
        <p className="text-sm text-muted-foreground">Create and edit ticket custom fields for your organization.</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Ticket custom fields</CardTitle>
            <CardDescription>Fields here appear on ticket creation and ticket details.</CardDescription>
          </div>
          <Button onClick={openCreateDialog} disabled={!canEditSettings}>
            <Plus className="mr-1 h-4 w-4" />
            Create field
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading custom fields...</p> : null}
          {!isLoading && sortedFields.length === 0 ? <p className="text-sm text-muted-foreground">No custom fields yet.</p> : null}

          {!isLoading && sortedFields.length > 0 ? (
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-3 font-medium">Label</th>
                  <th className="py-3 font-medium">Key</th>
                  <th className="py-3 font-medium">Type</th>
                  <th className="py-3 font-medium">Required</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFields.map((field) => (
                  <tr key={field.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{field.label}</td>
                    <td className="py-3 text-sm text-muted-foreground">{field.key}</td>
                    <td className="py-3">{field.field_type}</td>
                    <td className="py-3">{field.is_required ? "Yes" : "No"}</td>
                    <td className="py-3">{field.is_active ? "Active" : "Inactive"}</td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(field)} disabled={!canEditSettings}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void handleToggleActive(field)} disabled={!canEditSettings}>
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit custom field" : "Create custom field"}</DialogTitle>
            <DialogDescription>Configure how this field should appear and be stored on tickets.</DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleSave}>
            <div className="space-y-1">
              <Label htmlFor="custom-field-label">Label</Label>
              <Input
                id="custom-field-label"
                value={formState.label}
                onChange={(event) => {
                  const nextLabel = event.target.value;
                  setFormState((current) => ({
                    ...current,
                    label: nextLabel,
                    key:
                      current.id || current.key
                        ? current.key
                        : nextLabel
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "_")
                            .replace(/^_+|_+$/g, ""),
                  }));
                }}
                placeholder="Affected service"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom-field-key">Key</Label>
              <Input
                id="custom-field-key"
                value={formState.key}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    key: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]+/g, "_")
                      .replace(/^_+|_+$/g, ""),
                  }))
                }
                placeholder="affected_service"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom-field-type">Field type</Label>
              <select
                id="custom-field-type"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={formState.field_type}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    field_type: event.target.value as TicketFieldType,
                  }))
                }
              >
                {FIELD_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {(formState.field_type === "select" || formState.field_type === "multi_select") && (
              <div className="space-y-1">
                <Label htmlFor="custom-field-options">Options (one per line)</Label>
                <Textarea
                  id="custom-field-options"
                  value={formState.optionsText}
                  onChange={(event) => setFormState((current) => ({ ...current, optionsText: event.target.value }))}
                  rows={5}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="custom-field-placeholder">Placeholder (optional)</Label>
              <Input
                id="custom-field-placeholder"
                value={formState.placeholder}
                onChange={(event) => setFormState((current) => ({ ...current, placeholder: event.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom-field-order">Sort order</Label>
              <Input
                id="custom-field-order"
                type="number"
                min={1}
                value={formState.sort_order}
                onChange={(event) => setFormState((current) => ({ ...current, sort_order: Number(event.target.value) || 1 }))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.is_required}
                onChange={(event) => setFormState((current) => ({ ...current, is_required: event.target.checked }))}
              />
              Required field
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.is_active}
                onChange={(event) => setFormState((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Active field
            </label>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isEditing ? "Save field" : "Create field"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
