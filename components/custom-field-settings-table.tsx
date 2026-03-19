"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Ban, MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";

import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeRole } from "@/lib/roles";
import { supabase } from "@/lib/supabaseClient";
import { getOptionsFromConfig, type TicketFieldDefinition, type TicketFieldType } from "@/lib/ticketCustomFields";

type EditableField = TicketFieldDefinition & {
  config: Record<string, unknown> | null;
};

type FieldFilter = "active" | "inactive";

type FieldOptionFormState = {
  id: string;
  label: string;
};

type FieldFormState = {
  id: string | null;
  key: string;
  label: string;
  field_type: TicketFieldType;
  is_required: boolean;
  placeholder: string;
  options: FieldOptionFormState[];
  defaultBooleanValue: boolean | null;
  defaultSelectValue: string | null;
  defaultMultiSelectValues: string[];
  defaultDateToday: boolean;
};

type FieldTypeOption = {
  id: TicketFieldType;
  label: string;
};

const FIELD_TYPE_OPTIONS: FieldTypeOption[] = [
  { id: "text", label: "Text" },
  { id: "textarea", label: "Textarea" },
  { id: "select", label: "Select" },
  { id: "number", label: "Number" },
  { id: "boolean", label: "Boolean" },
  { id: "date", label: "Date" },
  { id: "multi_select", label: "Multi-select" },
];

const BOOLEAN_DEFAULT_OPTIONS = [
  { id: "none", label: "No default" },
  { id: "selected", label: "Selected" },
  { id: "deselected", label: "Deselected" },
] as const;

function getFieldTypeLabel(fieldType: TicketFieldType) {
  return FIELD_TYPE_OPTIONS.find((option) => option.id === fieldType)?.label ?? fieldType;
}

function orderFields(fields: EditableField[]) {
  return [...fields].sort((a, b) => {
    const labelDiff = a.label.localeCompare(b.label);
    if (labelDiff !== 0) {
      return labelDiff;
    }

    return a.key.localeCompare(b.key);
  });
}

function createOptionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeOptionValue(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toFieldFormState(field?: EditableField): FieldFormState {
  const config = field?.config ?? {};
  const options = getOptionsFromConfig(config).map((option) => ({
    id: createOptionId(),
    label: option.label,
  }));
  const defaultValue = config.defaultValue;

  return {
    id: field?.id ?? null,
    key: field?.key ?? "",
    label: field?.label ?? "",
    field_type: field?.field_type ?? "text",
    is_required: field?.is_required ?? false,
    placeholder: typeof config.placeholder === "string" ? config.placeholder : "",
    options,
    defaultBooleanValue: typeof defaultValue === "boolean" ? defaultValue : null,
    defaultSelectValue: typeof defaultValue === "string" ? defaultValue : null,
    defaultMultiSelectValues: Array.isArray(defaultValue)
      ? defaultValue.filter((value): value is string => typeof value === "string")
      : [],
    defaultDateToday: config.defaultToday === true,
  };
}

function buildConfig(formState: FieldFormState) {
  const config: Record<string, unknown> = {};
  const trimmedPlaceholder = formState.placeholder.trim();

  if (["text", "textarea", "select", "date", "multi_select"].includes(formState.field_type) && trimmedPlaceholder) {
    config.placeholder = trimmedPlaceholder;
  }

  if (formState.field_type === "select" || formState.field_type === "multi_select") {
    const options = formState.options
      .map((option) => option.label.trim())
      .filter(Boolean)
      .map((label) => ({
        label,
        value: sanitizeOptionValue(label),
      }))
      .filter((option) => option.value);

    config.options = options;

    if (formState.field_type === "select") {
      const defaultValue = typeof formState.defaultSelectValue === "string" ? formState.defaultSelectValue : null;
      if (defaultValue && options.some((option) => option.value === defaultValue)) {
        config.defaultValue = defaultValue;
      }
    }

    if (formState.field_type === "multi_select") {
      const validDefaultValues = formState.defaultMultiSelectValues.filter((value) => options.some((option) => option.value === value));
      if (validDefaultValues.length) {
        config.defaultValue = validDefaultValues;
      }
    }
  }

  if (formState.field_type === "boolean" && formState.defaultBooleanValue !== null) {
    config.defaultValue = formState.defaultBooleanValue;
  }

  if (formState.field_type === "date" && formState.defaultDateToday) {
    config.defaultToday = true;
  }

  return config;
}

function usesPlaceholder(fieldType: TicketFieldType) {
  return fieldType === "text" || fieldType === "textarea" || fieldType === "select" || fieldType === "multi_select" || fieldType === "date";
}

export function CustomFieldSettingsTable() {
  const [fields, setFields] = useState<EditableField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogErrorMessage, setDialogErrorMessage] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [canEditSettings, setCanEditSettings] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FieldFilter>("active");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FieldFormState>(toFieldFormState());
  const [hasManuallyEditedKey, setHasManuallyEditedKey] = useState(false);
  const [fieldPendingDeactivation, setFieldPendingDeactivation] = useState<EditableField | null>(null);
  const [fieldPendingDeletion, setFieldPendingDeletion] = useState<EditableField | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

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
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setErrorMessage(error.message || "Unable to load custom fields");
        setIsLoading(false);
        return;
      }

      setOrgId(profile.org_id);
      setCanEditSettings(normalizeRole(profile.role) === "admin");
      setFields(orderFields((data ?? []) as EditableField[]));
      setIsLoading(false);
    }

    void loadFields();

    return () => {
      isMounted = false;
    };
  }, []);

  const isEditing = formState.id !== null;

  const visibleFields = useMemo(
    () => fields.filter((field) => (selectedFilter === "active" ? field.is_active : !field.is_active)),
    [fields, selectedFilter]
  );

  const selectableOptions = useMemo(
    () =>
      formState.options
        .map((option) => {
          const trimmedLabel = option.label.trim();
          const value = sanitizeOptionValue(trimmedLabel);

          if (!trimmedLabel || !value) {
            return null;
          }

          return {
            id: value,
            label: trimmedLabel,
            optionId: option.id,
          };
        })
        .filter((option): option is { id: string; label: string; optionId: string } => option !== null),
    [formState.options]
  );

  const isEmpty = useMemo(() => !isLoading && !errorMessage && visibleFields.length === 0, [errorMessage, isLoading, visibleFields.length]);

  const filterButtonClassName = (isSelected: boolean) =>
    `rounded-full border shadow-xs ${
      isSelected
        ? "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
    }`;

  const openCreateDialog = () => {
    setFormState(toFieldFormState());
    setHasManuallyEditedKey(false);
    setDialogErrorMessage("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (field: EditableField) => {
    setFormState(toFieldFormState(field));
    setHasManuallyEditedKey(true);
    setDialogErrorMessage("");
    setIsDialogOpen(true);
  };

  const updateOption = (optionId: string, label: string) => {
    setFormState((current) => {
      const nextOptions = current.options.map((option) => (option.id === optionId ? { ...option, label } : option));
      const nextSelectableOptions = nextOptions
        .map((option) => {
          const trimmedLabel = option.label.trim();
          const value = sanitizeOptionValue(trimmedLabel);
          return trimmedLabel && value ? value : null;
        })
        .filter((value): value is string => Boolean(value));

      return {
        ...current,
        options: nextOptions,
        defaultSelectValue: current.defaultSelectValue && nextSelectableOptions.includes(current.defaultSelectValue) ? current.defaultSelectValue : null,
        defaultMultiSelectValues: current.defaultMultiSelectValues.filter((value) => nextSelectableOptions.includes(value)),
      };
    });
  };

  const addOption = () => {
    setFormState((current) => ({
      ...current,
      options: [...current.options, { id: createOptionId(), label: "" }],
    }));
  };

  const removeOption = (optionId: string) => {
    setFormState((current) => {
      const nextOptions = current.options.filter((option) => option.id !== optionId);
      const removedOption = current.options.find((option) => option.id === optionId);
      const removedValue = removedOption ? sanitizeOptionValue(removedOption.label.trim()) : null;

      return {
        ...current,
        options: nextOptions,
        defaultSelectValue: removedValue && current.defaultSelectValue === removedValue ? null : current.defaultSelectValue,
        defaultMultiSelectValues: removedValue
          ? current.defaultMultiSelectValues.filter((value) => value !== removedValue)
          : current.defaultMultiSelectValues,
      };
    });
  };

  const moveOption = (index: number, direction: -1 | 1) => {
    setFormState((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.options.length) {
        return current;
      }

      const nextOptions = [...current.options];
      const [movedOption] = nextOptions.splice(index, 1);
      nextOptions.splice(nextIndex, 0, movedOption);

      return {
        ...current,
        options: nextOptions,
      };
    });
  };

  const alphabetizeOptions = () => {
    setFormState((current) => ({
      ...current,
      options: [...current.options].sort((a, b) => a.label.localeCompare(b.label)),
    }));
  };

  const handleFieldTypeChange = (fieldType: TicketFieldType) => {
    setFormState((current) => {
      const nextState: FieldFormState = {
        ...current,
        field_type: fieldType,
      };

      if (!usesPlaceholder(fieldType)) {
        nextState.placeholder = "";
      }

      if (fieldType !== "select") {
        nextState.defaultSelectValue = null;
      }

      if (fieldType !== "multi_select") {
        nextState.defaultMultiSelectValues = [];
      }

      if (fieldType !== "boolean") {
        nextState.defaultBooleanValue = null;
      }

      if (fieldType !== "date") {
        nextState.defaultDateToday = false;
      }

      if (fieldType !== "select" && fieldType !== "multi_select") {
        nextState.options = [];
      } else if (current.options.length === 0) {
        nextState.options = [{ id: createOptionId(), label: "" }];
      }

      return nextState;
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEditSettings) {
      setDialogErrorMessage("This section is read-only for agents.");
      return;
    }

    if (!orgId) {
      setDialogErrorMessage("Unable to determine your organization");
      return;
    }

    if (!formState.label.trim() || !formState.key.trim()) {
      setDialogErrorMessage("Label and key are required.");
      return;
    }

    if ((formState.field_type === "select" || formState.field_type === "multi_select") && selectableOptions.length === 0) {
      setDialogErrorMessage("Add at least one option for select fields.");
      return;
    }

    const basePayload = {
      org_id: orgId,
      label: formState.label.trim(),
      is_required: formState.is_required,
      is_active: true,
      config: buildConfig(formState),
    };

    setIsSaving(true);
    setDialogErrorMessage("");

    if (formState.id) {
      const updatePayload = basePayload;
      const { data, error } = await supabase
        .from("ticket_field_definitions")
        .update(updatePayload)
        .eq("id", formState.id)
        .eq("org_id", orgId)
        .select("id, org_id, key, label, field_type, is_required, is_active, sort_order, config, created_at")
        .single();

      setIsSaving(false);

      if (error || !data) {
        setDialogErrorMessage(error?.message || "Unable to update custom field");
        return;
      }

      setFields((current) =>
        orderFields(current.map((field) => (field.id === data.id ? (data as EditableField) : field)))
      );
      setIsDialogOpen(false);
      setDialogErrorMessage("");
      return;
    }

    const createPayload = {
      ...basePayload,
      key: formState.key.trim().toLowerCase(),
      field_type: formState.field_type,
    };

    const { data, error } = await supabase
      .from("ticket_field_definitions")
      .insert(createPayload)
      .select("id, org_id, key, label, field_type, is_required, is_active, sort_order, config, created_at")
      .single();

    setIsSaving(false);

    if (error || !data) {
      setDialogErrorMessage(error?.message || "Unable to create custom field");
      return;
    }

    setFields((current) => orderFields([...current, data as EditableField]));
    setIsDialogOpen(false);
    setDialogErrorMessage("");
  };

  const handleActivate = async (fieldId: string) => {
    if (!canEditSettings) {
      setErrorMessage("This section is read-only for agents.");
      return;
    }

    if (!orgId) {
      setErrorMessage("Unable to determine your organization");
      return;
    }

    setStatusUpdatingId(fieldId);
    setErrorMessage("");

    const { error } = await supabase
      .from("ticket_field_definitions")
      .update({ is_active: true })
      .eq("id", fieldId)
      .eq("org_id", orgId);

    if (error) {
      setErrorMessage(error.message || "Unable to activate field");
      setStatusUpdatingId(null);
      return;
    }

    setFields((current) =>
      orderFields(
        current.map((field) =>
          field.id === fieldId
            ? {
                ...field,
                is_active: true,
              }
            : field
        )
      )
    );
    setStatusUpdatingId(null);
  };

  const handleDeactivate = async () => {
    if (!fieldPendingDeactivation) {
      return;
    }

    setIsSubmittingDeactivate(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("ticket_field_definitions")
      .update({ is_active: false })
      .eq("id", fieldPendingDeactivation.id)
      .eq("org_id", fieldPendingDeactivation.org_id);

    setIsSubmittingDeactivate(false);

    if (error) {
      setErrorMessage(error.message || "Unable to deactivate field");
      return;
    }

    setFields((current) =>
      orderFields(
        current.map((field) =>
          field.id === fieldPendingDeactivation.id
            ? {
                ...field,
                is_active: false,
              }
            : field
        )
      )
    );
    setFieldPendingDeactivation(null);
  };

  const handleDelete = async () => {
    if (!fieldPendingDeletion || !orgId) {
      setErrorMessage("Unable to determine your organization");
      return;
    }

    setIsSubmittingDelete(true);
    setErrorMessage("");

    const { error: valueDeleteError } = await supabase
      .from("ticket_field_values")
      .delete()
      .eq("field_definition_id", fieldPendingDeletion.id);

    if (valueDeleteError) {
      setErrorMessage(valueDeleteError.message || "Unable to remove custom field values");
      setIsSubmittingDelete(false);
      return;
    }

    const { error: fieldDeleteError } = await supabase
      .from("ticket_field_definitions")
      .delete()
      .eq("id", fieldPendingDeletion.id)
      .eq("org_id", orgId);

    setIsSubmittingDelete(false);

    if (fieldDeleteError) {
      setErrorMessage(fieldDeleteError.message || "Unable to delete custom field");
      return;
    }

    setFields((current) => current.filter((field) => field.id !== fieldPendingDeletion.id));
    setFieldPendingDeletion(null);
  };

  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Custom Fields</h1>
        <p className="text-sm text-muted-foreground">Create and manage ticket custom fields for your organization.</p>
      </header>

      <div className="flex items-center gap-2" role="radiogroup" aria-label="Filter custom fields by status">
        <Button
          type="button"
          onClick={() => setSelectedFilter("active")}
          variant="outline"
          className={filterButtonClassName(selectedFilter === "active")}
          role="radio"
          aria-checked={selectedFilter === "active"}
        >
          Active
        </Button>
        <Button
          type="button"
          onClick={() => setSelectedFilter("inactive")}
          variant="outline"
          className={filterButtonClassName(selectedFilter === "inactive")}
          role="radio"
          aria-checked={selectedFilter === "inactive"}
        >
          Inactive
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Ticket custom fields</CardTitle>
            <CardDescription>Fields here appear on ticket creation and ticket details.</CardDescription>
          </div>
          <Button type="button" onClick={openCreateDialog} disabled={!canEditSettings}>
            <Plus className="mr-1 h-4 w-4" />
            Create field
          </Button>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

          {isLoading ? <p className="text-sm text-muted-foreground">Loading custom fields...</p> : null}
          {isEmpty ? (
            <p className="text-sm text-muted-foreground">
              {selectedFilter === "active" ? "No active custom fields found." : "No inactive custom fields found."}
            </p>
          ) : null}

          {!isLoading && !isEmpty ? (
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-3 font-medium">Label</th>
                  <th className="py-3 font-medium">Key</th>
                  <th className="py-3 font-medium">Type</th>
                  <th className="py-3 font-medium">Placeholder</th>
                  <th className="w-16 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleFields.map((field) => (
                  <tr key={field.id} className="border-b last:border-0">
                    <td className="py-4 font-medium">{field.label}</td>
                    <td className="py-4 text-sm text-muted-foreground">{field.key}</td>
                    <td className="py-4">{getFieldTypeLabel(field.field_type)}</td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {typeof field.config?.placeholder === "string" && field.config.placeholder.trim()
                        ? field.config.placeholder
                        : "—"}
                    </td>
                    <td className="py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!canEditSettings}>
                          <Button variant="ghost" size="icon" aria-label={`Open actions for ${field.label}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              openEditDialog(field);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          {field.is_active ? (
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onSelect={() => {
                                setFieldPendingDeactivation(field);
                              }}
                            >
                              <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem
                                className="text-emerald-700 focus:text-emerald-700"
                                disabled={statusUpdatingId === field.id}
                                onSelect={() => {
                                  void handleActivate(field.id);
                                }}
                              >
                                <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                                {statusUpdatingId === field.id ? "Activating..." : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={() => {
                                  setFieldPendingDeletion(field);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(nextOpen) => {
          if (isSaving) {
            return;
          }

          setIsDialogOpen(nextOpen);
          if (!nextOpen) {
            setDialogErrorMessage("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit custom field" : "Create custom field"}</DialogTitle>
            <DialogDescription>Configure how this field should appear and be stored on tickets.</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSave}>
            {dialogErrorMessage ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{dialogErrorMessage}</p> : null}

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
                      current.id || hasManuallyEditedKey
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
                onChange={(event) => {
                  setHasManuallyEditedKey(true);
                  setFormState((current) => ({
                    ...current,
                    key: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]+/g, "_")
                      .replace(/^_+|_+$/g, ""),
                  }));
                }}
                placeholder="affected_service"
                required
                disabled={isEditing}
              />
              {isEditing ? <p className="text-xs text-muted-foreground">Key cannot be changed after the field is created.</p> : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom-field-type">Field type</Label>
              <div id="custom-field-type">
                <LookupDropdown
                  items={FIELD_TYPE_OPTIONS}
                  selectedId={formState.field_type}
                  onSelect={(selectedId) => {
                    if (!selectedId) {
                      return;
                    }

                    handleFieldTypeChange(selectedId as TicketFieldType);
                  }}
                  getItemLabel={(type) => type.label}
                  placeholder="Select field type"
                  searchable={false}
                  emptyText="No field types found"
                  disabled={isEditing}
                />
              </div>
              {isEditing ? <p className="text-xs text-muted-foreground">Field type cannot be changed after the field is created.</p> : null}
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="custom-field-required"
                  checked={formState.is_required}
                  onCheckedChange={(checked) => {
                    setFormState((current) => ({
                      ...current,
                      is_required: checked === true,
                    }));
                  }}
                />
                <Label htmlFor="custom-field-required">Required field</Label>
              </div>
            </div>

            {usesPlaceholder(formState.field_type) ? (
              <div className="space-y-1">
                <Label htmlFor="custom-field-placeholder">Placeholder</Label>
                <Input
                  id="custom-field-placeholder"
                  value={formState.placeholder}
                  onChange={(event) => setFormState((current) => ({ ...current, placeholder: event.target.value }))}
                />
              </div>
            ) : null}

            {formState.field_type === "boolean" ? (
              <div className="space-y-1">
                <Label htmlFor="custom-field-default-boolean">Default value</Label>
                <div id="custom-field-default-boolean">
                  <LookupDropdown
                    items={BOOLEAN_DEFAULT_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
                    selectedId={
                      formState.defaultBooleanValue === null
                        ? "none"
                        : formState.defaultBooleanValue
                          ? "selected"
                          : "deselected"
                    }
                    onSelect={(selectedId) => {
                      if (selectedId === "selected") {
                        setFormState((current) => ({ ...current, defaultBooleanValue: true }));
                        return;
                      }

                      if (selectedId === "deselected") {
                        setFormState((current) => ({ ...current, defaultBooleanValue: false }));
                        return;
                      }

                      setFormState((current) => ({ ...current, defaultBooleanValue: null }));
                    }}
                    getItemLabel={(option) => option.label}
                    placeholder="Select default"
                    searchable={false}
                    emptyText="No defaults found"
                  />
                </div>
              </div>
            ) : null}

            {(formState.field_type === "select" || formState.field_type === "multi_select") ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium">Values</h3>
                    <p className="text-xs text-muted-foreground">Add, reorder, and clean up the selectable values for this field.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={alphabetizeOptions} disabled={formState.options.length < 2}>
                      Alphabetize
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={addOption} aria-label="Add option">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {formState.options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Input
                        value={option.label}
                        onChange={(event) => updateOption(option.id, event.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => moveOption(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move option ${index + 1} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => moveOption(index, 1)}
                        disabled={index === formState.options.length - 1}
                        aria-label={`Move option ${index + 1} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="text-red-600 hover:text-red-600"
                        onClick={() => removeOption(option.id)}
                        disabled={formState.options.length === 1}
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {formState.field_type === "select" ? (
                  <div className="space-y-1">
                    <Label htmlFor="custom-field-default-select">Default</Label>
                    <div id="custom-field-default-select">
                      <LookupDropdown
                        items={[{ id: "", label: "No default" }, ...selectableOptions]}
                        selectedId={formState.defaultSelectValue ?? ""}
                        onSelect={(selectedId) => {
                          setFormState((current) => ({
                            ...current,
                            defaultSelectValue: selectedId || null,
                          }));
                        }}
                        getItemLabel={(option) => option.label}
                        placeholder="Select default"
                        searchable={false}
                        emptyText="No values configured"
                        disabled={selectableOptions.length === 0}
                      />
                    </div>
                  </div>
                ) : null}

                {formState.field_type === "multi_select" ? (
                  <div className="space-y-2">
                    <Label>Default</Label>
                    {selectableOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Add values before choosing defaults.</p>
                    ) : (
                      <div className="space-y-2 rounded-md border p-3">
                        {selectableOptions.map((option) => {
                          const isSelected = formState.defaultMultiSelectValues.includes(option.id);

                          return (
                            <label key={option.optionId} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  setFormState((current) => ({
                                    ...current,
                                    defaultMultiSelectValues:
                                      checked === true
                                        ? [...current.defaultMultiSelectValues, option.id]
                                        : current.defaultMultiSelectValues.filter((value) => value !== option.id),
                                  }));
                                }}
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {formState.field_type === "date" ? (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="custom-field-date-default-today"
                    checked={formState.defaultDateToday}
                    onCheckedChange={(checked) => {
                      setFormState((current) => ({
                        ...current,
                        defaultDateToday: checked === true,
                      }));
                    }}
                  />
                  <Label htmlFor="custom-field-date-default-today">Default to today</Label>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isEditing ? "Save field" : "Create field"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fieldPendingDeactivation !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isSubmittingDeactivate) {
            setFieldPendingDeactivation(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Custom Field</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <span className="font-medium text-foreground">{fieldPendingDeactivation?.label}</span>? It
              will no longer appear when creating or updating tickets.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFieldPendingDeactivation(null)}
              disabled={isSubmittingDeactivate}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDeactivate()} disabled={isSubmittingDeactivate}>
              {isSubmittingDeactivate ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fieldPendingDeletion !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isSubmittingDelete) {
            setFieldPendingDeletion(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Custom Field</DialogTitle>
            <DialogDescription>
              Deleting <span className="font-medium text-foreground">{fieldPendingDeletion?.label}</span> will permanently remove the field and
              any saved values that tickets currently have for it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFieldPendingDeletion(null)} disabled={isSubmittingDelete}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isSubmittingDelete}>
              {isSubmittingDelete ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
