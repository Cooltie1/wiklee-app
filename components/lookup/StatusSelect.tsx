"use client";

import { useEffect, useState } from "react";

import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

type Status = {
  id: string;
  label: string;
  sort_order: number | null;
  created_at: string;
};

type StatusSelectProps = {
  value: string | null;
  onChange: (id: string | null) => void;
  showLabel?: boolean;
  triggerClassName?: string;
};

export function StatusSelect({ value, onChange, showLabel = true, triggerClassName }: StatusSelectProps) {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadStatuses = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("ticket_statuses")
        .select("id, label, sort_order, created_at")
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
      {showLabel ? <Label htmlFor="status">Status</Label> : null}
      <div id="status">
        <LookupDropdown
          items={statuses}
          selectedId={value}
          onSelect={onChange}
          getItemLabel={(status) => status.label}
          placeholder="Select status"
          searchable={false}
          emptyText="No statuses found"
          loading={isLoading}
          triggerClassName={triggerClassName}
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
