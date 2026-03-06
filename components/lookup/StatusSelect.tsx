"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { Label } from "@/components/ui/label";
import type { TicketStatusRow } from "@/lib/useModal";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type Status = {
  id: string;
  label: string;
  color: TicketStatusRow["color"];
  sort_order: number | null;
  created_at: string;
};

const STATUS_DOT_CLASS: Record<TicketStatusRow["color"], string> = {
  green: "bg-green-600",
  amber: "bg-amber-600",
  red: "bg-red-600",
  blue: "bg-blue-600",
  purple: "bg-purple-600",
  zinc: "bg-zinc-600",
};

const STATUS_CHECK_CLASS: Record<TicketStatusRow["color"], string> = {
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
  zinc: "text-zinc-600",
};

type StatusSelectProps = {
  value: string | null;
  onChange: (id: string | null) => void;
};

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadStatuses = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        if (isMounted) {
          setErrorMessage("Unable to determine current user");
          setStatuses([]);
          setIsLoading(false);
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile?.org_id) {
        if (isMounted) {
          setErrorMessage("Unable to determine your organization");
          setStatuses([]);
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("ticket_statuses")
        .select("id, label, color, sort_order, created_at")
        .or(`org_id.eq.${profile.org_id},org_id.is.null`)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Unable to load statuses");
        setStatuses([]);
        setIsLoading(false);
        return;
      }

      setStatuses((data ?? []) as Status[]);
      setIsLoading(false);
    };

    void loadStatuses();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="status">Status</Label>
      <div id="status">
        <LookupDropdown
          items={statuses}
          selectedId={value}
          onSelect={onChange}
          getItemLabel={(status) => status.label}
          renderSelected={(status) => (
            <span className="flex w-full items-center justify-start gap-2 text-left">
              <span className={cn("h-2 w-2 rounded-full", STATUS_DOT_CLASS[status.color])} aria-hidden="true" />
              <span className="truncate">{status.label}</span>
            </span>
          )}
          renderItem={(status) => (
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
                {value === status.id ? (
                  <Check className={cn("h-4 w-4", STATUS_CHECK_CLASS[status.color])} />
                ) : (
                  <span className={cn("h-2 w-2 rounded-full", STATUS_DOT_CLASS[status.color])} />
                )}
              </span>
              <span>{status.label}</span>
            </span>
          )}
          showSelectionIndicator={false}
          placeholder="Select status"
          searchable={false}
          emptyText="No statuses found"
          loading={isLoading}
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
