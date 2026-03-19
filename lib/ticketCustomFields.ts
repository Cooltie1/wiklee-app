export type TicketFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "boolean"
  | "date"
  | "multi_select";

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

function formatTodayAsDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getOptionsFromConfig(
  config: Record<string, unknown> | null,
): TicketFieldOption[] {
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
        const optionValue =
          typeof option.value === "string" ? option.value : null;
        const optionLabel =
          typeof option.label === "string" ? option.label : optionValue;

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

export function getFormValueFromRow(
  definition: TicketFieldDefinition,
  row: TicketFieldValueRow | undefined,
): CustomFieldFormValue {
  if (!row) {
    const config = definition.config ?? {};

    switch (definition.field_type) {
      case "boolean":
        return typeof config.default === "boolean" ? config.default : null;
      case "date":
        return config.default === "today" ? formatTodayAsDateString() : null;
      case "select":
        return typeof config.default === "string" && config.default
          ? config.default
          : null;
      case "multi_select":
        return Array.isArray(config.default)
          ? config.default.filter(
              (item): item is string => typeof item === "string",
            )
          : [];
      default:
        return null;
    }
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
      return Array.isArray(row.value_json)
        ? row.value_json.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
    default:
      return null;
  }
}

export function sortTicketFieldDefinitions(
  definitions: TicketFieldDefinition[],
): TicketFieldDefinition[] {
  return [...definitions].sort((a, b) => {
    const labelDiff = a.label.localeCompare(b.label);
    if (labelDiff !== 0) {
      return labelDiff;
    }

    return a.key.localeCompare(b.key);
  });
}

export function isCustomFieldMissingValue(
  definition: TicketFieldDefinition,
  value: CustomFieldFormValue,
): boolean {
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

export function formatCustomFieldValue(
  definition: TicketFieldDefinition,
  value: CustomFieldFormValue,
): string {
  if (value === null) {
    return "—";
  }

  if (definition.field_type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (definition.field_type === "multi_select") {
    const options = getOptionsFromConfig(definition.config);
    const optionByValue = new Map(
      options.map((option) => [option.value, option.label]),
    );
    const selectedValues = Array.isArray(value) ? value : [];

    if (!selectedValues.length) {
      return "—";
    }

    return selectedValues
      .map((selectedValue) => optionByValue.get(selectedValue) ?? selectedValue)
      .join(", ");
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
  formValue: CustomFieldFormValue,
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
      baseValue.value_text =
        typeof formValue === "string" && formValue.trim() ? formValue : null;
      break;
    case "number":
      baseValue.value_number =
        typeof formValue === "number" && Number.isFinite(formValue)
          ? formValue
          : null;
      break;
    case "boolean":
      baseValue.value_boolean =
        typeof formValue === "boolean" ? formValue : null;
      break;
    case "date":
      baseValue.value_date =
        typeof formValue === "string" && formValue ? formValue : null;
      break;
    case "multi_select":
      baseValue.value_json = Array.isArray(formValue) ? formValue : [];
      break;
  }

  return baseValue;
}
