export type TicketFieldType = "text" | "textarea" | "select" | "number" | "boolean" | "date" | "multi_select";

export type TicketFieldDefinition = {
  id: string;
  org_id: string;
  key: string;
  label: string;
  field_type: TicketFieldType;
  is_required?: boolean;
  is_active: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
};

export type TicketFieldValueRow = {
  id?: string;
  ticket_id: string;
  field_definition_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_json: unknown | null;
  created_at?: string;
  updated_at?: string;
};

export type CustomFieldFormValue = string | number | boolean | string[] | null;

export type TicketFieldOption = {
  label: string;
  value: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getOptionsFromConfig(config: Record<string, unknown> | null): TicketFieldOption[] {
  if (!config) return [];

  const options = config.options;

  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      if (typeof option === "string") {
        return { label: option, value: option };
      }

      if (isRecord(option)) {
        const optionValue = typeof option.value === "string" ? option.value : null;
        const optionLabel = typeof option.label === "string" ? option.label : optionValue;

        if (!optionLabel || !optionValue) {
          return null;
        }

        return {
          label: optionLabel,
          value: optionValue,
        };
      }

      return null;
    })
    .filter((option): option is TicketFieldOption => option !== null);
}

function getTodayDateValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export function getDefaultFormValue(definition: TicketFieldDefinition): CustomFieldFormValue {
  const config = definition.config ?? {};

  switch (definition.field_type) {
    case "boolean":
      return typeof config.default_boolean === "boolean" ? config.default_boolean : null;
    case "date":
      return config.default_today === true ? getTodayDateValue() : null;
    case "select": {
      const defaultValue = typeof config.default_value === "string" ? config.default_value : null;
      if (!defaultValue) {
        return null;
      }

      const options = getOptionsFromConfig(definition.config);
      return options.some((option) => option.value === defaultValue) ? defaultValue : null;
    }
    case "multi_select": {
      const defaultValues = Array.isArray(config.default_values)
        ? config.default_values.filter((value): value is string => typeof value === "string")
        : [];
      const options = new Set(getOptionsFromConfig(definition.config).map((option) => option.value));
      return defaultValues.filter((value) => options.has(value));
    }
    default:
      return null;
  }
}

export function getFormValueFromRow(definition: TicketFieldDefinition, row: TicketFieldValueRow | undefined): CustomFieldFormValue {
  if (!row) {
    return getDefaultFormValue(definition);
  }

  switch (definition.field_type) {
    case "text":
    case "textarea":
    case "select":
      return row.value_text;
    case "number":
      return row.value_number;
    case "boolean":
      return row.value_boolean;
    case "date":
      return row.value_date;
    case "multi_select":
      return Array.isArray(row.value_json) ? row.value_json.filter((item): item is string => typeof item === "string") : [];
    default:
      return null;
  }
}

export function sortTicketFieldDefinitions(definitions: TicketFieldDefinition[]): TicketFieldDefinition[] {
  return [...definitions].sort((a, b) => {
    const labelDiff = a.label.localeCompare(b.label);
    if (labelDiff !== 0) {
      return labelDiff;
    }

    return a.key.localeCompare(b.key);
  });
}

export function isCustomFieldMissingValue(definition: TicketFieldDefinition, value: CustomFieldFormValue): boolean {
  if (!definition.is_required) {
    return false;
  }

  switch (definition.field_type) {
    case "boolean":
      return value === null;
    case "multi_select":
      return !Array.isArray(value) || value.length === 0;
    case "number":
      return value === null || value === "";
    default:
      return value === null || (typeof value === "string" && !value.trim());
  }
}

export function formatCustomFieldValue(definition: TicketFieldDefinition, value: CustomFieldFormValue): string {
  if (value === null) {
    return "—";
  }

  if (definition.field_type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (definition.field_type === "multi_select") {
    const options = getOptionsFromConfig(definition.config);
    const optionByValue = new Map(options.map((option) => [option.value, option.label]));
    const selectedValues = Array.isArray(value) ? value : [];

    if (!selectedValues.length) {
      return "—";
    }

    return selectedValues.map((selectedValue) => optionByValue.get(selectedValue) ?? selectedValue).join(", ");
  }

  if (definition.field_type === "select") {
    const options = getOptionsFromConfig(definition.config);
    const selectedValue = typeof value === "string" ? value : "";
    const option = options.find((item) => item.value === selectedValue);
    return option?.label ?? selectedValue ?? "—";
  }

  return String(value);
}

export function buildValueUpsertRow(
  ticketId: string,
  definition: TicketFieldDefinition,
  formValue: CustomFieldFormValue
): TicketFieldValueRow {
  const baseValue = {
    ticket_id: ticketId,
    field_definition_id: definition.id,
    value_text: null,
    value_number: null,
    value_boolean: null,
    value_date: null,
    value_json: null,
  } as TicketFieldValueRow;

  switch (definition.field_type) {
    case "text":
    case "textarea":
    case "select":
      baseValue.value_text = typeof formValue === "string" && formValue.trim() ? formValue : null;
      break;
    case "number":
      baseValue.value_number = typeof formValue === "number" && Number.isFinite(formValue) ? formValue : null;
      break;
    case "boolean":
      baseValue.value_boolean = typeof formValue === "boolean" ? formValue : null;
      break;
    case "date":
      baseValue.value_date = typeof formValue === "string" && formValue ? formValue : null;
      break;
    case "multi_select":
      baseValue.value_json = Array.isArray(formValue) ? formValue : [];
      break;
  }

  return baseValue;
}
