"use client";

import { useEffect, useState } from "react";

import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

type Priority = {
  id: string;
  label: string;
  sort_order: number | null;
  created_at: string;
};

type PrioritySelectProps = {
  value: string | null;
  onChange: (id: string | null) => void;
};

export function PrioritySelect({ value, onChange }: PrioritySelectProps) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPriorities = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        if (isMounted) {
          setErrorMessage("Unable to determine current user");
          setPriorities([]);
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
          setPriorities([]);
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("ticket_priorities")
        .select("id, label, sort_order, created_at")
        .eq("org_id", profile.org_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Unable to load priorities");
        setPriorities([]);
        setIsLoading(false);
        return;
      }

      const loadedPriorities = (data ?? []) as Priority[];
      setPriorities(loadedPriorities);
      setIsLoading(false);
    };

    loadPriorities();

    return () => {
      isMounted = false;
    };
  }, [onChange]);

  useEffect(() => {
    if (!priorities.length || value) {
      return;
    }

    onChange(priorities[0].id);
  }, [onChange, priorities, value]);

  return (
    <div className="space-y-2">
      <Label htmlFor="priority">Priority</Label>
      <div id="priority">
        <LookupDropdown
          items={priorities}
          selectedId={value}
          onSelect={onChange}
          getItemLabel={(priority) => priority.label}
          placeholder="Select priority"
          searchable={false}
          emptyText="No priorities found"
          loading={isLoading}
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
