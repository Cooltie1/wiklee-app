"use client"

import { Label } from "@/components/ui/label"
import { UserCombobox, type ComboboxUser } from "@/components/UserCombobox"

type OwnerSelectProps = {
  users: ComboboxUser[]
  value: string | null
  currentUserId: string
  onChange: (value: string | null) => void
  errorMessage?: string
  disabled?: boolean
  disabledMessage?: string
}

export function OwnerSelect({
  users,
  value,
  currentUserId,
  onChange,
  errorMessage,
  disabled,
  disabledMessage,
}: OwnerSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="owner">Owner</Label>
      <div id="owner">
        <UserCombobox
          users={users}
          value={value}
          onValueChange={onChange}
          placeholder="Unassigned"
          searchPlaceholder="Search agents..."
          emptyText="No users found"
          disabled={disabled}
          topAction={{
            label: "Assign to me",
            active: value === currentUserId,
            onSelect: () => onChange(currentUserId),
          }}
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
      {disabledMessage ? <p className="text-xs text-zinc-500">{disabledMessage}</p> : null}
    </div>
  )
}
