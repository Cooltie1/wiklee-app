import { CustomFieldRenderer } from "@/components/tickets/custom-fields/CustomFieldRenderer";
import { type CustomFieldFormValue, type TicketFieldDefinition } from "@/lib/ticketCustomFields";

type CustomFieldsSectionProps = {
  definitions: TicketFieldDefinition[];
  values: Record<string, CustomFieldFormValue>;
  onChange?: (fieldDefinitionId: string, value: CustomFieldFormValue) => void;
  validationErrors?: Record<string, string>;
  disabled?: boolean;
  readOnly?: boolean;
  title?: string;
  textFieldClassName?: string;
  useNativeBooleanCheckbox?: boolean;
};

export function CustomFieldsSection({
  definitions,
  values,
  onChange,
  validationErrors,
  disabled,
  readOnly,
  title = "Custom fields",
  textFieldClassName,
  useNativeBooleanCheckbox,
}: CustomFieldsSectionProps) {
  if (!definitions.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="space-y-3">
        {definitions.map((definition) => (
          <CustomFieldRenderer
            key={definition.id}
            definition={definition}
            value={values[definition.id] ?? null}
            onChange={onChange ? (nextValue) => onChange(definition.id, nextValue) : undefined}
            errorMessage={validationErrors?.[definition.id]}
            disabled={disabled}
            readOnly={readOnly}
            textFieldClassName={textFieldClassName}
            useNativeBooleanCheckbox={useNativeBooleanCheckbox}
          />
        ))}
      </div>
    </div>
  );
}
