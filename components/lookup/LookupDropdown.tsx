"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type LookupItem = {
  id: string;
};

type LookupDropdownProps<T extends LookupItem> = {
  items: T[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  getItemLabel: (item: T) => string;
  placeholder: string;
  searchable: boolean;
  searchPlaceholder?: string;
  emptyText: string;
  loading?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
};

export function LookupDropdown<T extends LookupItem>({
  items,
  selectedId,
  onSelect,
  getItemLabel,
  placeholder,
  searchable,
  searchPlaceholder,
  emptyText,
  loading,
  disabled,
  allowClear,
  clearLabel = "None",
}: LookupDropdownProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const isDisabled = disabled || loading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className="w-full justify-between"
        >
          {selectedItem ? (
            <span className="truncate">{getItemLabel(selectedItem)}</span>
          ) : (
            <span className="text-muted-foreground">{loading ? "Loading..." : placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          {searchable ? <CommandInput placeholder={searchPlaceholder ?? "Search..."} /> : null}
          <CommandList>
            {!loading ? <CommandEmpty>{emptyText}</CommandEmpty> : null}
            {loading ? <div className="p-2 text-sm text-muted-foreground">Loading...</div> : null}
            {!loading ? (
              <CommandGroup>
                {allowClear ? (
                  <CommandItem
                    value={clearLabel}
                    onSelect={() => {
                      onSelect(null);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("size-4", selectedId === null ? "opacity-100" : "opacity-0")} />
                    <span>{clearLabel}</span>
                  </CommandItem>
                ) : null}
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${getItemLabel(item)} ${item.id}`}
                    onSelect={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("size-4", selectedId === item.id ? "opacity-100" : "opacity-0")} />
                    <span>{getItemLabel(item)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
