"use client";

import Link from "next/link";
import { DragEvent, useEffect, useMemo, useState } from "react";
import { Ban, GripVertical, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabaseClient";
import { useModal, type TicketPriorityRow } from "@/lib/useModal";

type TicketPriority = {
  id: string;
  label: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type PriorityFilter = "active" | "inactive";

function orderPriorities(priorities: TicketPriority[]) {
  return [...priorities].sort((a, b) => {
    const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.label.localeCompare(b.label);
  });
}

export function PrioritySettingsTable() {
  const { openModal } = useModal();
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<PriorityFilter>("active");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPriorities() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase.from("ticket_priorities").select("id, label, description, sort_order, is_active");

      if (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load priorities");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setPriorities(orderPriorities((data ?? []) as TicketPriority[]));
        setLoading(false);
      }
    }

    void loadPriorities();

    return () => {
      isMounted = false;
    };
  }, []);

  const visiblePriorities = useMemo(
    () => priorities.filter((priority) => (selectedFilter === "active" ? priority.is_active : !priority.is_active)),
    [priorities, selectedFilter]
  );

  const isEmpty = useMemo(() => !loading && !errorMessage && visiblePriorities.length === 0, [errorMessage, loading, visiblePriorities.length]);

  const filterButtonClassName = (isSelected: boolean) =>
    `rounded-full border shadow-xs ${
      isSelected
        ? "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
    }`;

  const handlePriorityCreated = (priority: TicketPriorityRow) => {
    setPriorities((current) =>
      orderPriorities([
        ...current,
        {
          id: priority.id,
          label: priority.label,
          description: priority.description,
          sort_order: priority.sort_order,
          is_active: priority.is_active,
        },
      ])
    );
  };

  const handlePriorityUpdated = (priority: TicketPriorityRow) => {
    setPriorities((current) =>
      orderPriorities(
        current.map((existingPriority) =>
          existingPriority.id === priority.id
            ? {
                ...existingPriority,
                label: priority.label,
                description: priority.description,
                sort_order: priority.sort_order,
                is_active: priority.is_active,
              }
            : existingPriority
        )
      )
    );
  };

  const handlePriorityDeactivated = (priorityId: string) => {
    setPriorities((current) =>
      orderPriorities(
        current.map((priority) =>
          priority.id === priorityId
            ? {
                ...priority,
                is_active: false,
              }
            : priority
        )
      )
    );
  };

  const handlePriorityDeleted = (priorityId: string) => {
    setPriorities((current) => current.filter((priority) => priority.id !== priorityId));
  };

  const handlePriorityActivated = async (priorityId: string) => {
    setStatusUpdatingId(priorityId);
    setErrorMessage("");

    const { error } = await supabase.from("ticket_priorities").update({ is_active: true }).eq("id", priorityId);

    if (error) {
      setErrorMessage(error.message || "Unable to activate priority");
      setStatusUpdatingId(null);
      return;
    }

    setPriorities((current) =>
      orderPriorities(
        current.map((priority) =>
          priority.id === priorityId
            ? {
                ...priority,
                is_active: true,
              }
            : priority
        )
      )
    );
    setStatusUpdatingId(null);
  };

  const persistOrder = async (orderedVisiblePriorities: TicketPriority[]) => {
    setSavingOrder(true);

    const updates = orderedVisiblePriorities.map((priority, index) =>
      supabase
        .from("ticket_priorities")
        .update({ sort_order: index + 1 })
        .eq("id", priority.id)
    );

    const results = await Promise.all(updates);
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      setErrorMessage(failedResult.error.message || "Unable to save priority order");
    } else {
      setErrorMessage("");
      const reorderedIds = orderedVisiblePriorities.map((priority) => priority.id);
      const updatedById = new Map<string, TicketPriority>(
        orderedVisiblePriorities.map((priority, index) => [priority.id, { ...priority, sort_order: index + 1 }])
      );

      setPriorities((current) => {
        const unaffected = current.filter((priority) => !reorderedIds.includes(priority.id));
        const reordered = reorderedIds.map((id) => updatedById.get(id)).filter((priority): priority is TicketPriority => priority !== undefined);

        return orderPriorities([...unaffected, ...reordered]);
      });
    }

    setSavingOrder(false);
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId || savingOrder) {
      return;
    }

    const sourceIndex = visiblePriorities.findIndex((priority) => priority.id === draggingId);
    const targetIndex = visiblePriorities.findIndex((priority) => priority.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = [...visiblePriorities];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setPriorities((current) => {
      const reorderedIds = reordered.map((priority) => priority.id);
      const unaffected = current.filter((priority) => !reorderedIds.includes(priority.id));
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
          <li className="text-foreground">Priority</li>
        </ol>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Priority</h1>
        <p className="text-sm text-muted-foreground">Manage priority labels and drag rows to change the display order.</p>
      </header>

      <div className="flex items-center gap-2" role="radiogroup" aria-label="Filter priorities by status">
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
            <CardTitle>Priorities</CardTitle>
            <CardDescription>Reorder priorities using drag and drop. Changes save automatically.</CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => {
              openModal("createPriority", {
                onCreated: handlePriorityCreated,
              });
            }}
          >
            Create Priority
          </Button>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

          {loading ? <p className="text-sm text-muted-foreground">Loading priorities...</p> : null}

          {isEmpty ? <p className="text-sm text-muted-foreground">No priorities found.</p> : null}

          {!loading && !isEmpty ? (
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="w-16 py-3 font-medium">Order</th>
                  <th className="py-3 font-medium">Label</th>
                  <th className="py-3 font-medium">Description</th>
                  <th className="w-16 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visiblePriorities.map((priority, index) => (
                  <tr
                    key={priority.id}
                    className="border-b last:border-0"
                    draggable={!savingOrder}
                    onDragStart={(event: DragEvent<HTMLTableRowElement>) => {
                      setDraggingId(priority.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event: DragEvent<HTMLTableRowElement>) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event: DragEvent<HTMLTableRowElement>) => {
                      event.preventDefault();
                      handleDrop(priority.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-4 font-medium">{priority.label}</td>
                    <td className="py-4 text-sm text-muted-foreground">{priority.description ?? "—"}</td>
                    <td className="py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open actions for ${priority.label}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              openModal("createPriority", {
                                priorityId: priority.id,
                                defaultLabel: priority.label,
                                defaultDescription: priority.description ?? "",
                                onUpdated: handlePriorityUpdated,
                              });
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          {priority.is_active ? (
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onSelect={() => {
                                openModal("deactivatePriority", {
                                  priorityId: priority.id,
                                  priorityLabel: priority.label,
                                  onDeactivated: handlePriorityDeactivated,
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
                                disabled={statusUpdatingId === priority.id}
                                onSelect={() => {
                                  void handlePriorityActivated(priority.id);
                                }}
                              >
                                <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                                {statusUpdatingId === priority.id ? "Activating..." : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={() => {
                                  openModal("deletePriority", {
                                    priorityId: priority.id,
                                    priorityLabel: priority.label,
                                    onDeleted: handlePriorityDeleted,
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
