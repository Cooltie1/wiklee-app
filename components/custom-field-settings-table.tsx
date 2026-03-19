"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpAZ, Ban, MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";

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
import { sortTicketFieldDefinitions, type TicketFieldDefinition, type TicketFieldType } from "@/lib/ticketCustomFields";

type EditableField = TicketFieldDefinition & {
  config: Record<string, unknown> | null;
};

type FieldFilter = "active" | "inactive";

type FieldOptionFormState = {
  id: string;
  label: string;
};

type BooleanDefaultValue = "selected" | "deselected" | "";

type FieldFormState = {
  id: string | null;
  key: string;
  label: string;
  field_type: TicketFieldType;
  placeholder: string;
  options: FieldOptionFormState[];
  booleanDefaultValue: BooleanDefaultValue;
  selectDefaultValue: string;
  multiSelectDefaultValues: string[];
  dateDefaultToday: boolean;
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

function getFieldTypeLabel(fieldType: TicketFieldType) {
  return FIELD_TYPE_OPTIONS.find((option) => option.id === fieldType)?.label ?? fieldType;
}

function createOption(label = ""): FieldOptionFormState {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
  };
}

function getOptionValue(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getOptionValueMap(options: FieldOptionFormState[]) {
  return new Map(options.map((option) => [option.id, getOptionValue(option.label)]));
}

function normalizeSelectedValues(values: string[], options: FieldOptionFormState[]) {
  const allowedValues = new Set(
    options
      .map((option) => getOptionValue(option.label))
      .filter(Boolean)
  );

  return values.filter((value) => allowedValues.has(value));
}

function getDefaultFormState(fieldType: TicketFieldType): Pick<
  FieldFormState,
  "placeholder" | "options" | "booleanDefaultValue" | "selectDefaultValue" | "multiSelectDefaultValues" | "dateDefaultToday"
> {
  switch (fieldType) {
    case "select":
    case "multi_select":
      return {
        placeholder: "",
        options: [createOption()],
        booleanDefaultValue: "",
        selectDefaultValue: "",
        multiSelectDefaultValues: [],
        dateDefaultToday: false,
      };
    case "boolean":
      return {
        placeholder: "",
        options: [],
        booleanDefaultValue: "deselected",
        selectDefaultValue: "",
        multiSelectDefaultValues: [],
        dateDefaultToday: false,
      };
    case "date":
      return {
        placeholder: "",
        options: [],
        booleanDefaultValue: "",
        selectDefaultValue: "",
        multiSelectDefaultValues: [],
        dateDefaultToday: false,
      };
    default:
      return {
        placeholder: fieldType === "text" || fieldType === "textarea" ? "" : "",
        options: [],
        booleanDefaultValue: "",
        selectDefaultValue: "",
        multiSelectDefaultValues: [],
        dateDefaultToday: false,
      };
  }
}

function toFieldFormState(field?: EditableField): FieldFormState {
  const config = field?.config ?? {};
  const rawOptions = Array.isArray(config.options) ? config.options : [];
  const options = rawOptions
    .map((option) => {
      if (typeof option === "string") {
        return createOption(option);
      }

      if (option && typeof option === "object" && typeof (option as { label?: unknown }).label === "string") {
        return createOption((option as { label: string }).label);
      }

      return null;
    })
    .filter((option): option is FieldOptionFormState => option !== null);

  const nextOptions = field?.field_type === "select" || field?.field_type === "multi_select" ? options.length ? options : [createOption()] : [];

  return {
    id: field?.id ?? null,
    key: field?.key ?? "",
    label: field?.label ?? "",
    field_type: field?.field_type ?? "text",
    placeholder: typeof config.placeholder === "string" ? config.placeholder : "",
    options: nextOptions,
    booleanDefaultValue:
      typeof config.default_boolean === "boolean" ? (config.default_boolean ? "selected" : "deselected") : field?.field_type === "boolean" ? "deselected" : "",
    selectDefaultValue: typeof config.default_value === "string" ? config.default_value : "",
    multiSelectDefaultValues: Array.isArray(config.default_values)
      ? config.default_values.filter((value): value is string => typeof value === "string")
      : [],
    dateDefaultToday: config.default_today === true,
  };
}

function buildConfig(formState: FieldFormState) {
  const config: Record<string, unknown> = {};

  if (["text", "textarea", "number", "select", "multi_select", "date"].includes(formState.field_type)) {
    config.placeholder = formState.placeholder.trim() || "";
  }

  if (formState.field_type === "select" || formState.field_type === "multi_select") {
    const options = formState.options
      .map((option) => option.label.trim())
      .filter(Boolean)
      .map((label) => ({
        label,
        value: getOptionValue(label),
      }));

    config.options = options;

    if (formState.field_type === "select") {
      config.default_value = formState.selectDefaultValue || "";
    }

    if (formState.field_type === "multi_select") {
      config.default_values = formState.multiSelectDefaultValues;
    }
  }

  if (formState.field_type === "boolean") {
    config.default_boolean = formState.booleanDefaultValue === "selected";
  }

  if (formState.field_type === "date") {
    config.default_today = formState.dateDefaultToday;
  }

  return config;
}

function ValueListEditor({
  fieldType,
  options,
  selectedValues,
  onOptionsChange,
  onSelectedValuesChange,
}: {
  fieldType: "select" | "multi_select";
  options: FieldOptionFormState[];
  selectedValues: string[];
  onOptionsChange: (options: FieldOptionFormState[]) => void;
  onSelectedValuesChange: (values: string[]) => void;
}) {
  const valueMap = getOptionValueMap(options);

  const moveOption = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= options.length) {
      return;
    }

    const nextOptions = [...options];
    const [item] = nextOptions.splice(index, 1);
    nextOptions.splice(nextIndex, 0, item);
    onOptionsChange(nextOptions);
  };

  const updateOptionLabel = (optionId: string, label: string) => {
    const nextOptions = options.map((option) => (option.id === optionId ? { ...option, label } : option));
    const nextMap = getOptionValueMap(nextOptions);
    const remappedDefaults = selectedValues
      .map((selectedValue) => {
        const matchingPreviousOption = options.find((option) => valueMap.get(option.id) === selectedValue);
        if (!matchingPreviousOption) {
          return selectedValue;
        }

        return nextMap.get(matchingPreviousOption.id) ?? "";
      })
      .filter(Boolean);

    onOptionsChange(nextOptions);
    onSelectedValuesChange(Array.from(new Set(normalizeSelectedValues(remappedDefaults, nextOptions))));
  };

  const removeOption = (optionId: string) => {
    const nextOptions = options.filter((option) => option.id !== optionId);
    const ensuredOptions = nextOptions.length ? nextOptions : [createOption()];
    const removedValue = valueMap.get(optionId);

    onOptionsChange(ensuredOptions);
    onSelectedValuesChange(normalizeSelectedValues(selectedValues.filter((value) => value !== removedValue), ensuredOptions));
  };

  const addOption = () => {
    onOptionsChange([...options, createOption()]);
  };

  const alphabetizeOptions = () => {
    const nextOptions = [...options].sort((left, right) => left.label.localeCompare(right.label));
    onOptionsChange(nextOptions);
  };

  const toggleDefaultValue = (optionId: string, checked: boolean) => {
    const optionValue = valueMap.get(optionId) ?? "";
    if (!optionValue) {
      return;
    }

    if (fieldType === "select") {
      onSelectedValuesChange(checked ? [optionValue] : []);
      return;
    }

    const nextValues = checked ? [...selectedValues, optionValue] : selectedValues.filter((value) => value !== optionValue);
    onSelectedValuesChange(Array.from(new Set(nextValues)));
  };

  return (
    <div className="space-y-3 rounded-md border border-input p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Values</p>
          <p className="text-xs text-muted-foreground">
            {fieldType === "multi_select"
              ? "Use the checkboxes to choose default selected values."
              : "Use the checkbox to mark the default selected value."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={alphabetizeOptions}>
            <ArrowUpAZ className="mr-1 h-4 w-4" />
            Alphabetize
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={addOption} aria-label="Add value">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => {
          const optionValue = valueMap.get(option.id) ?? "";
          const isChecked = selectedValues.includes(optionValue);

          return (
            <div key={option.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) => toggleDefaultValue(option.id, checked === true)}
                aria-label={`Set ${option.label || `value ${index + 1}`} as default`}
              />
              <Input
                value={option.label}
                onChange={(event) => updateOptionLabel(option.id, event.target.value)}
                placeholder={`Value ${index + 1}`}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveOption(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${option.label || `value ${index + 1}`} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveOption(index, 1)}
                  disabled={index === options.length - 1}
                  aria-label={`Move ${option.label || `value ${index + 1}`} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(option.id)}
                  className="text-red-600 hover:text-red-700"
                  aria-label={`Remove ${option.label || `value ${index + 1}`}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
        .select("id, org_id, key, label, field_type, is_active, config, created_at")
        .eq("org_id", profile.org_id);

      if (!isMounted) return;

      if (error) {
        setErrorMessage(error.message || "Unable to load custom fields");
        setIsLoading(false);
        return;
      }

      setOrgId(profile.org_id);
      setCanEditSettings(normalizeRole(profile.role) === "admin");
      setFields(sortTicketFieldDefinitions((data ?? []) as EditableField[]));
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

  const handleFieldTypeChange = (fieldType: TicketFieldType) => {
    setFormState((current) => ({
      ...current,
      field_type: fieldType,
      ...getDefaultFormState(fieldType),
    }));
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

    const trimmedOptions = formState.options.map((option) => option.label.trim()).filter(Boolean);
    if ((formState.field_type === "select" || formState.field_type === "multi_select") && trimmedOptions.length === 0) {
      setDialogErrorMessage("Add at least one value for select and multi-select fields.");
      return;
    }

    const basePayload = {
      org_id: orgId,
      label: formState.label.trim(),
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
        .select("id, org_id, key, label, field_type, is_active, config, created_at")
        .single();

      setIsSaving(false);

      if (error || !data) {
        setDialogErrorMessage(error?.message || "Unable to update custom field");
        return;
      }

      setFields((current) =>
        sortTicketFieldDefinitions(current.map((field) => (field.id === data.id ? (data as EditableField) : field)))
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
      .select("id, org_id, key, label, field_type, is_active, config, created_at")
      .single();

    setIsSaving(false);

    if (error || !data) {
      setDialogErrorMessage(error?.message || "Unable to create custom field");
      return;
    }

    setFields((current) => sortTicketFieldDefinitions([...current, data as EditableField]));
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
      sortTicketFieldDefinitions(
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
      sortTicketFieldDefinitions(
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

  const typeSpecificConfig = (() => {
    if (formState.field_type === "text" || formState.field_type === "textarea" || formState.field_type === "number") {
      return (
        <div className="space-y-1">
          <Label htmlFor="custom-field-placeholder">Placeholder</Label>
          <Input
            id="custom-field-placeholder"
            value={formState.placeholder}
            onChange={(event) => setFormState((current) => ({ ...current, placeholder: event.target.value }))}
            placeholder={
              formState.field_type === "textarea" ? "Add more detail" : formState.field_type === "number" ? "Enter a number" : "Type a value"
            }
          />
        </div>
      );
    }

    if (formState.field_type === "boolean") {
      return (
        <div className="space-y-1">
          <Label htmlFor="custom-field-boolean-default">Default value</Label>
          <div id="custom-field-boolean-default">
            <LookupDropdown
              items={[
                { id: "selected", label: "Selected" },
                { id: "deselected", label: "Deselected" },
              ]}
              selectedId={formState.booleanDefaultValue || "deselected"}
              onSelect={(selectedId) => {
                if (!selectedId) return;
                setFormState((current) => ({ ...current, booleanDefaultValue: selectedId as BooleanDefaultValue }));
              }}
              getItemLabel={(item) => item.label}
              placeholder="Select a default value"
              searchable={false}
              emptyText="No values found"
            />
          </div>
        </div>
      );
    }

    if (formState.field_type === "select" || formState.field_type === "multi_select") {
      const selectedDefaults = formState.field_type === "select"
        ? formState.selectDefaultValue
          ? [formState.selectDefaultValue]
          : []
        : formState.multiSelectDefaultValues;

      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="custom-field-placeholder">Placeholder</Label>
            <Input
              id="custom-field-placeholder"
              value={formState.placeholder}
              onChange={(event) => setFormState((current) => ({ ...current, placeholder: event.target.value }))}
              placeholder={formState.field_type === "multi_select" ? "Select one or more values" : "Select a value"}
            />
          </div>

          <ValueListEditor
            fieldType={formState.field_type}
            options={formState.options}
            selectedValues={selectedDefaults}
            onOptionsChange={(options) => {
              setFormState((current) => ({
                ...current,
                options,
                selectDefaultValue:
                  current.field_type === "select"
                    ? normalizeSelectedValues(current.selectDefaultValue ? [current.selectDefaultValue] : [], options)[0] ?? ""
                    : current.selectDefaultValue,
                multiSelectDefaultValues:
                  current.field_type === "multi_select"
                    ? normalizeSelectedValues(current.multiSelectDefaultValues, options)
                    : current.multiSelectDefaultValues,
              }));
            }}
            onSelectedValuesChange={(values) => {
              setFormState((current) => ({
                ...current,
                selectDefaultValue: current.field_type === "select" ? values[0] ?? "" : current.selectDefaultValue,
                multiSelectDefaultValues: current.field_type === "multi_select" ? values : current.multiSelectDefaultValues,
              }));
            }}
          />

          <div className="space-y-1">
            <Label>Default</Label>
            <p className="text-xs text-muted-foreground">
              {selectedDefaults.length
                ? formState.options
                    .filter((option) => selectedDefaults.includes(getOptionValue(option.label)))
                    .map((option) => option.label.trim())
                    .filter(Boolean)
                    .join(formState.field_type === "multi_select" ? ", " : "")
                : "No default selected"}
            </p>
          </div>
        </div>
      );
    }

    if (formState.field_type === "date") {
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="custom-field-placeholder">Placeholder</Label>
            <Input
              id="custom-field-placeholder"
              value={formState.placeholder}
              onChange={(event) => setFormState((current) => ({ ...current, placeholder: event.target.value }))}
              placeholder="Pick a date"
            />
          </div>

          <label htmlFor="custom-field-date-default-today" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Checkbox
              id="custom-field-date-default-today"
              checked={formState.dateDefaultToday}
              onCheckedChange={(checked) => setFormState((current) => ({ ...current, dateDefaultToday: checked === true }))}
            />
            Default to today
          </label>
        </div>
      );
    }

    return null;
  })();

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
        <DialogContent>
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

            {typeSpecificConfig}

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
