"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { useModal, type TicketCategoryRow } from "@/lib/useModal";

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
  const { openModal } = useModal();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
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

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCategoryCreated = (category: TicketCategoryRow) => {
    const nextCategory: Category = {
      id: category.id,
      name: category.name,
      sort_order: category.sort_order,
      created_at: category.created_at,
    };

    setCategories((current) => {
      const merged = [...current, nextCategory];
      return merged.sort((a, b) => {
        const aSort = a.sort_order ?? 0;
        const bSort = b.sort_order ?? 0;

        if (aSort !== bSort) {
          return aSort - bSort;
        }

        return a.created_at.localeCompare(b.created_at);
      });
    });

    onChange(category.id);
  };

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
          action={{
            label: "Edit",
            icon: Pencil,
            onClick: () =>
              openModal("createCategory", {
                onCreated: handleCategoryCreated,
              }),
          }}
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
