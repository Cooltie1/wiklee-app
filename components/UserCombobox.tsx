"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ComboboxUser = {
  id: string
  first_name: string | null
  last_name: string | null
  avatarUrl?: string | null
}

type TopAction = {
  label: string
  active?: boolean
  onSelect: () => void
}

type UserComboboxProps = {
  users: ComboboxUser[]
  value: string | null
  onValueChange: (userId: string | null) => void
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  disabled?: boolean
  topAction?: TopAction
}

function getDisplayName(user: ComboboxUser) {
  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
  return fullName || "Unknown User"
}

function getInitials(user: ComboboxUser) {
  const name = getDisplayName(user)
  if (name === "Unknown User") return "?"

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function UserOption({ user }: { user: ComboboxUser }) {
  return (
    <>
      <Avatar className="size-6">
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={`${getDisplayName(user)} avatar`} /> : null}
        <AvatarFallback>{getInitials(user)}</AvatarFallback>
      </Avatar>
      <span>{getDisplayName(user)}</span>
    </>
  )
}

export function UserCombobox({
  users,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  topAction,
}: UserComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedUser = useMemo(() => users.find((user) => user.id === value) ?? null, [users, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedUser ? (
            <span className="flex items-center gap-2 truncate">
              <UserOption user={selectedUser} />
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {topAction ? (
              <>
                <CommandGroup>
                  <CommandItem
                    value={topAction.label}
                    onSelect={() => {
                      topAction.onSelect()
                      setOpen(false)
                    }}
                    className={cn(topAction.active ? "text-emerald-600" : undefined)}
                  >
                    <Check className={cn("size-4", topAction.active ? "opacity-100" : "opacity-0")} />
                    <span>{topAction.label}</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            ) : null}
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${getDisplayName(user)} ${user.id}`}
                  onSelect={() => {
                    onValueChange(user.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("size-4", value === user.id ? "opacity-100" : "opacity-0")} />
                  <UserOption user={user} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
