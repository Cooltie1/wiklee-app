"use client"

import { Label } from "@/components/ui/label"
import { UserCombobox, type ComboboxUser } from "@/components/UserCombobox"

type RequesterSelectProps = {
  users: ComboboxUser[]
  value: string | null
  onChange: (value: string | null) => void
  errorMessage?: string
  disabled?: boolean
}

export function RequesterSelect({ users, value, onChange, errorMessage, disabled }: RequesterSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="requester">Requester</Label>
      <div id="requester">
        <UserCombobox
          users={users}
          value={value}
          onValueChange={onChange}
          placeholder="Select requester"
          searchPlaceholder="Search requesters..."
          emptyText="No users found"
          disabled={disabled}
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  )
}
