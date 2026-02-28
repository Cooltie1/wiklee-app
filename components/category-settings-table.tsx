"use client";

import Link from "next/link";
import { DragEvent, useEffect, useMemo, useState } from "react";
import { Ban, GripVertical, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabaseClient";
import { useModal, type TicketCategoryRow } from "@/lib/useModal";

type TicketCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type CategoryFilter = "active" | "inactive";

function orderCategories(categories: TicketCategory[]) {
  return [...categories].sort((a, b) => {
    const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.name.localeCompare(b.name);
  });
}

export function CategorySettingsTable() {
  const { openModal } = useModal();
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>("active");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setLoading(true);
      setErrorMessage("");

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        if (isMounted) {
          setErrorMessage("Unable to determine current user");
          setLoading(false);
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
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("ticket_categories")
        .select("id, name, description, sort_order, is_active")
        .eq("org_id", profile.org_id);

      if (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load categories");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setCategories(orderCategories((data ?? []) as TicketCategory[]));
        setLoading(false);
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleCategories = useMemo(
    () => categories.filter((category) => (selectedFilter === "active" ? category.is_active : !category.is_active)),
    [categories, selectedFilter]
  );

  const isEmpty = useMemo(() => !loading && !errorMessage && visibleCategories.length === 0, [errorMessage, loading, visibleCategories.length]);

  const filterButtonClassName = (isSelected: boolean) =>
    `rounded-full border shadow-xs ${
      isSelected
        ? "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
    }`;

  const handleCategoryCreated = (category: TicketCategoryRow) => {
    setCategories((current) =>
      orderCategories([
        ...current,
        {
          id: category.id,
          name: category.name,
          description: category.description,
          sort_order: category.sort_order,
          is_active: category.is_active,
        },
      ])
    );
  };

  const handleCategoryUpdated = (category: TicketCategoryRow) => {
    setCategories((current) =>
      orderCategories(
        current.map((existingCategory) =>
          existingCategory.id === category.id
            ? {
                ...existingCategory,
                name: category.name,
                description: category.description,
                sort_order: category.sort_order,
                is_active: category.is_active,
              }
            : existingCategory
        )
      )
    );
  };

  const handleCategoryDeactivated = (categoryId: string) => {
    setCategories((current) =>
      orderCategories(
        current.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                is_active: false,
              }
            : category
        )
      )
    );
  };

  const handleCategoryDeleted = (categoryId: string) => {
    setCategories((current) => current.filter((category) => category.id !== categoryId));
  };

  const handleCategoryActivated = async (categoryId: string) => {
    setStatusUpdatingId(categoryId);
    setErrorMessage("");

    const { error } = await supabase.from("ticket_categories").update({ is_active: true }).eq("id", categoryId);

    if (error) {
      setErrorMessage(error.message || "Unable to activate category");
      setStatusUpdatingId(null);
      return;
    }

    setCategories((current) =>
      orderCategories(
        current.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                is_active: true,
              }
            : category
        )
      )
    );
    setStatusUpdatingId(null);
  };

  const persistOrder = async (orderedVisibleCategories: TicketCategory[]) => {
    setSavingOrder(true);

    const updates = orderedVisibleCategories.map((category, index) =>
      supabase
        .from("ticket_categories")
        .update({ sort_order: index + 1 })
        .eq("id", category.id)
    );

    const results = await Promise.all(updates);
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      setErrorMessage(failedResult.error.message || "Unable to save category order");
    } else {
      setErrorMessage("");
      const reorderedIds = orderedVisibleCategories.map((category) => category.id);
      const updatedById = new Map(orderedVisibleCategories.map((category, index) => [category.id, { ...category, sort_order: index + 1 }]));

      setCategories((current) => {
        const unaffected = current.filter((category) => !reorderedIds.includes(category.id));
        const reordered = reorderedIds
          .map((id) => updatedById.get(id))
          .filter((category): category is TicketCategory => Boolean(category));

        return orderCategories([...unaffected, ...reordered]);
      });
    }

    setSavingOrder(false);
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId || savingOrder) {
      return;
    }

    const sourceIndex = visibleCategories.findIndex((category) => category.id === draggingId);
    const targetIndex = visibleCategories.findIndex((category) => category.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = [...visibleCategories];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setCategories((current) => {
      const reorderedIds = reordered.map((category) => category.id);
      const unaffected = current.filter((category) => !reorderedIds.includes(category.id));
      return [...unaffected, ...reordered];
    });

    void persistOrder(reordered);
  };

  return (
    <section className="grid gap-4">
      <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/settings/standard-fields" className="hover:text-foreground hover:underline">
              Standard Fields
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Category</li>
        </ol>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Category</h1>
        <p className="text-sm text-muted-foreground">Manage category labels and drag rows to change the display order.</p>
      </header>

      <div className="flex items-center gap-2" role="radiogroup" aria-label="Filter categories by status">
        <Button
          type="button"
          onClick={() => setSelectedFilter("active")}
          variant="outline"
          className={filterButtonClassName(selectedFilter === "active")}
          role="radio"
          aria-checked={selectedFilter === "active"}
        >
          Active
        </Button>
        <Button
          type="button"
          onClick={() => setSelectedFilter("inactive")}
          variant="outline"
          className={filterButtonClassName(selectedFilter === "inactive")}
          role="radio"
          aria-checked={selectedFilter === "inactive"}
        >
          Inactive
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Reorder categories using drag and drop. Changes save automatically.</CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => {
              openModal("createCategory", {
                onCreated: handleCategoryCreated,
              });
            }}
          >
            Create Category
          </Button>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

          {loading ? <p className="text-sm text-muted-foreground">Loading categories...</p> : null}

          {isEmpty ? <p className="text-sm text-muted-foreground">No categories found.</p> : null}

          {!loading && !isEmpty ? (
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="w-16 py-3 font-medium">Order</th>
                  <th className="w-48 py-3 font-medium">ID</th>
                  <th className="py-3 font-medium">Name</th>
                  <th className="py-3 font-medium">Description</th>
                  <th className="w-16 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleCategories.map((category, index) => (
                  <tr
                    key={category.id}
                    className="border-b last:border-0"
                    draggable={!savingOrder}
                    onDragStart={(event: DragEvent<HTMLTableRowElement>) => {
                      setDraggingId(category.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event: DragEvent<HTMLTableRowElement>) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event: DragEvent<HTMLTableRowElement>) => {
                      event.preventDefault();
                      handleDrop(category.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-4 font-mono text-xs text-muted-foreground">{category.id}</td>
                    <td className="py-4 font-medium">{category.name}</td>
                    <td className="py-4 text-sm text-muted-foreground">{category.description ?? "—"}</td>
                    <td className="py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open actions for ${category.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              openModal("createCategory", {
                                categoryId: category.id,
                                defaultName: category.name,
                                defaultDescription: category.description ?? "",
                                onUpdated: handleCategoryUpdated,
                              });
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          {category.is_active ? (
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onSelect={() => {
                                openModal("deactivateCategory", {
                                  categoryId: category.id,
                                  categoryName: category.name,
                                  onDeactivated: handleCategoryDeactivated,
                                });
                              }}
                            >
                              <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem
                                className="text-emerald-700 focus:text-emerald-700"
                                disabled={statusUpdatingId === category.id}
                                onSelect={() => {
                                  void handleCategoryActivated(category.id);
                                }}
                              >
                                <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                                {statusUpdatingId === category.id ? "Activating..." : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={() => {
                                  openModal("deleteCategory", {
                                    categoryId: category.id,
                                    categoryName: category.name,
                                    onDeleted: handleCategoryDeleted,
                                  });
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {savingOrder ? <p className="mt-3 text-xs text-muted-foreground">Saving order...</p> : null}
        </CardContent>
      </Card>
    </section>
  );
}
