"use client";

import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { supabase } from "@/lib/supabaseClient";

type Category = {
  id: string;
  name: string;
  sort_order: number | null;
  created_at: string;
};

type CategorySelectProps = {
  value: string | null;
  onChange: (id: string | null) => void;
};

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("ticket_categories")
        .select("id, name, sort_order, created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Unable to load categories");
        setCategories([]);
        setIsLoading(false);
        return;
      }

      setCategories((data ?? []) as Category[]);
      setIsLoading(false);
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="category">Category</Label>
      <div id="category">
        <LookupDropdown
          items={categories}
          selectedId={value}
          onSelect={onChange}
          getItemLabel={(category) => category.name}
          placeholder="None"
          searchable
          searchPlaceholder="Search categories..."
          emptyText="No categories found"
          loading={isLoading}
          allowClear
          clearLabel="None"
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
