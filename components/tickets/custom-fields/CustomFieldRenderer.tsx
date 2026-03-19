import { format, parse } from "date-fns";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";

import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  type CustomFieldFormValue,
  formatCustomFieldValue,
  getOptionsFromConfig,
  type TicketFieldDefinition,
} from "@/lib/ticketCustomFields";

type CustomFieldRendererProps = {
  definition: TicketFieldDefinition;
  value: CustomFieldFormValue;
  onChange?: (value: CustomFieldFormValue) => void;
  errorMessage?: string;
  disabled?: boolean;
  readOnly?: boolean;
  textFieldClassName?: string;
};

type CustomFieldMultiSelectProps = {
  id: string;
  options: Array<{ label: string; value: string }>;
  selectedValues: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  disabled?: boolean;
};

function CustomFieldMultiSelect({ id, options, selectedValues, onChange, placeholder, disabled }: CustomFieldMultiSelectProps) {
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-auto min-h-10 w-full items-start justify-between gap-2 whitespace-normal py-2 text-left"
          disabled={disabled}
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            {selectedOptions.length ? (
              <div className="flex max-w-full flex-wrap gap-1.5 whitespace-normal">
                {selectedOptions.map((option) => (
                  <span key={option.value} className="max-w-full rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] leading-4 text-white break-words">
                    {option.label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="block truncate text-sm text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDownIcon className="mt-0.5 size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-3" align="start">
        <div className="space-y-2">
          {options.length === 0 ? <p className="text-xs text-zinc-500">No options configured.</p> : null}
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);

            return (
              <label key={option.value} className="flex items-center gap-2 text-sm text-zinc-700">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      onChange([...selectedValues, option.value]);
                      return;
                    }

                    onChange(selectedValues.filter((selectedValue) => selectedValue !== option.value));
                  }}
                  disabled={disabled}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseDateValue(value: CustomFieldFormValue) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function CustomFieldRenderer({ definition, value, onChange, errorMessage, disabled, readOnly, textFieldClassName }: CustomFieldRendererProps) {
  const options = getOptionsFromConfig(definition.config);
  const requiredMark = definition.is_required ? " *" : "";
  const presentation = definition.config ?? {};
  const placeholder = typeof presentation.placeholder === "string" ? presentation.placeholder : "";
  const selectedDate = parseDateValue(value);
  const isBooleanField = definition.field_type === "boolean";

  if (readOnly) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-500">{definition.label}</p>
        <p className="text-sm text-zinc-900">{formatCustomFieldValue(definition, value)}</p>
      </div>
    );
  }

  if (!onChange) {
    return null;
  }

  return (
    <div className={isBooleanField ? "space-y-1" : "space-y-2"}>
      {!isBooleanField ? <Label htmlFor={definition.id}>{`${definition.label}${requiredMark}`}</Label> : null}

      {definition.field_type === "text" && (
        <Input
          id={definition.id}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={definition.is_required}
          disabled={disabled}
          className={textFieldClassName}
        />
      )}

      {definition.field_type === "date" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={definition.id}
              type="button"
              variant="outline"
              data-empty={!selectedDate}
              className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
              disabled={disabled}
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="size-4 opacity-60" />
                <span>{selectedDate ? format(selectedDate, "PPP") : placeholder || "Pick a date"}</span>
              </span>
              <ChevronDownIcon className="size-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(selectedDate) => onChange(selectedDate ? format(selectedDate, "yyyy-MM-dd") : null)}
              defaultMonth={selectedDate}
            />
          </PopoverContent>
        </Popover>
      )}

      {definition.field_type === "textarea" && (
        <Textarea
          id={definition.id}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={definition.is_required}
          disabled={disabled}
          rows={typeof presentation.rows === "number" ? presentation.rows : 4}
          className={textFieldClassName}
        />
      )}

      {definition.field_type === "number" && (
        <Input
          id={definition.id}
          type="number"
          value={typeof value === "number" ? String(value) : ""}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue === "" ? null : Number(nextValue));
          }}
          placeholder={placeholder}
          required={definition.is_required}
          disabled={disabled}
          className={textFieldClassName}
        />
      )}

      {definition.field_type === "boolean" && (
        <label htmlFor={definition.id} className="flex items-center gap-2 text-sm text-zinc-700">
          <Checkbox
            id={definition.id}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
            disabled={disabled}
            className="mt-0.5"
          />
          <span className="font-semibold">{`${definition.label}${requiredMark}`}</span>
        </label>
      )}

      {definition.field_type === "select" && (
        <LookupDropdown
          items={options.map((option) => ({ id: option.value, label: option.label }))}
          selectedId={typeof value === "string" ? value : null}
          onSelect={onChange}
          getItemLabel={(option) => option.label}
          placeholder="Select an option"
          searchable={false}
          emptyText="No options configured"
          disabled={disabled}
        />
      )}

      {definition.field_type === "multi_select" && (
        <CustomFieldMultiSelect
          id={definition.id}
          options={options}
          selectedValues={Array.isArray(value) ? value : []}
          onChange={onChange}
          placeholder={placeholder || "Select one or more options"}
          disabled={disabled}
        />
      )}

      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
