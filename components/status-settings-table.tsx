"use client";

import Link from "next/link";
import { DragEvent, useEffect, useMemo, useState } from "react";
import { Ban, GripVertical, Lock, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";

import { StatusLabel } from "@/components/status-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabaseClient";
import { useModal, type TicketStatusRow } from "@/lib/useModal";

type TicketStatus = {
  id: string;
  org_id: string | null;
  label: string;
  description: string | null;
  color: TicketStatusRow["color"];
  sort_order: number | null;
  is_active: boolean;
};

type StatusFilter = "active" | "inactive";

const isSystemStatus = (status: TicketStatus) => status.org_id === null;

function orderStatuses(statuses: TicketStatus[]) {
  return [...statuses].sort((a, b) => {
    const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.label.localeCompare(b.label);
  });
}

export function StatusSettingsTable() {
  const { openModal } = useModal();
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatuses() {
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
        .from("ticket_statuses")
        .select("id, org_id, label, description, color, sort_order, is_active")
        .or(`org_id.eq.${profile.org_id},org_id.is.null`);

      if (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load statuses");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setStatuses(orderStatuses((data ?? []) as TicketStatus[]));
        setLoading(false);
      }
    }

    void loadStatuses();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleStatuses = useMemo(
    () => statuses.filter((status) => (selectedFilter === "active" ? status.is_active : !status.is_active)),
    [statuses, selectedFilter]
  );

  const visibleSystemStatuses = useMemo(() => visibleStatuses.filter(isSystemStatus), [visibleStatuses]);
  const visibleCustomStatuses = useMemo(() => visibleStatuses.filter((status) => !isSystemStatus(status)), [visibleStatuses]);

  const isEmpty = useMemo(() => !loading && !errorMessage && visibleStatuses.length === 0, [errorMessage, loading, visibleStatuses.length]);

  const filterButtonClassName = (isSelected: boolean) =>
    `rounded-full border shadow-xs ${
      isSelected
        ? "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
    }`;

  const handleStatusCreated = (status: TicketStatusRow) => {
    setStatuses((current) =>
      orderStatuses([
        ...current,
        {
          id: status.id,
          org_id: status.org_id,
          label: status.label,
          description: status.description,
          color: status.color,
          sort_order: status.sort_order,
          is_active: status.is_active,
        },
      ])
    );
  };

  const handleStatusUpdated = (status: TicketStatusRow) => {
    setStatuses((current) =>
      orderStatuses(
        current.map((existingStatus) =>
          existingStatus.id === status.id
            ? {
                ...existingStatus,
                org_id: status.org_id,
                label: status.label,
                description: status.description,
                color: status.color,
                sort_order: status.sort_order,
                is_active: status.is_active,
              }
            : existingStatus
        )
      )
    );
  };

  const handleStatusDeactivated = (statusId: string) => {
    setStatuses((current) =>
      orderStatuses(
        current.map((status) =>
          status.id === statusId
            ? {
                ...status,
                is_active: false,
              }
            : status
        )
      )
    );
  };

  const handleStatusDeleted = (statusId: string) => {
    setStatuses((current) => current.filter((status) => status.id !== statusId));
  };

  const handleStatusActivated = async (statusId: string) => {
    setStatusUpdatingId(statusId);
    setErrorMessage("");

    const { error } = await supabase.from("ticket_statuses").update({ is_active: true }).eq("id", statusId);

    if (error) {
      setErrorMessage(error.message || "Unable to activate status");
      setStatusUpdatingId(null);
      return;
    }

    setStatuses((current) =>
      orderStatuses(
        current.map((status) =>
          status.id === statusId
            ? {
                ...status,
                is_active: true,
              }
            : status
        )
      )
    );
    setStatusUpdatingId(null);
  };

  const persistOrder = async (orderedCustomStatuses: TicketStatus[]) => {
    setSavingOrder(true);

    const systemStatusCount = statuses.filter(isSystemStatus).length;

    const updates = orderedCustomStatuses.map((status, index) =>
      supabase
        .from("ticket_statuses")
        .update({ sort_order: systemStatusCount + index + 1 })
        .eq("id", status.id)
    );

    const results = await Promise.all(updates);
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      setErrorMessage(failedResult.error.message || "Unable to save status order");
    } else {
      setErrorMessage("");
      const reorderedIds = orderedCustomStatuses.map((status) => status.id);
      const updatedById = new Map<string, TicketStatus>(
        orderedCustomStatuses.map((status, index) => [status.id, { ...status, sort_order: systemStatusCount + index + 1 }])
      );

      setStatuses((current) => {
        const unaffected = current.filter((status) => !reorderedIds.includes(status.id));
        const reordered = reorderedIds.map((id) => updatedById.get(id)).filter((status): status is TicketStatus => status !== undefined);

        return orderStatuses([...unaffected, ...reordered]);
      });
    }

    setSavingOrder(false);
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId || savingOrder) {
      return;
    }

    const sourceIndex = visibleCustomStatuses.findIndex((status) => status.id === draggingId);
    const targetIndex = visibleCustomStatuses.findIndex((status) => status.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = [...visibleCustomStatuses];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setStatuses((current) => {
      const reorderedIds = reordered.map((status) => status.id);
      const unaffected = current.filter((status) => !reorderedIds.includes(status.id));
      return orderStatuses([...unaffected, ...reordered]);
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
          <li className="text-foreground">Status</li>
        </ol>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Status</h1>
        <p className="text-sm text-muted-foreground">Manage status labels and drag rows to change the display order.</p>
      </header>

      <div className="flex items-center gap-2" role="radiogroup" aria-label="Filter statuses by status">
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
            <CardTitle>Statuses</CardTitle>
            <CardDescription>
              System statuses are locked to the top. You can reorder custom statuses beneath them and changes save automatically.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => {
              openModal("createStatus", {
                onCreated: handleStatusCreated,
              });
            }}
          >
            Create Status
          </Button>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

          {loading ? <p className="text-sm text-muted-foreground">Loading statuses...</p> : null}

          {isEmpty ? <p className="text-sm text-muted-foreground">No statuses found.</p> : null}

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
                {[...visibleSystemStatuses, ...visibleCustomStatuses].map((status, index) => (
                  <tr
                    key={status.id}
                    className="border-b last:border-0"
                    draggable={!savingOrder && !isSystemStatus(status)}
                    onDragStart={(event: DragEvent<HTMLTableRowElement>) => {
                      if (isSystemStatus(status)) {
                        return;
                      }
                      setDraggingId(status.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event: DragEvent<HTMLTableRowElement>) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event: DragEvent<HTMLTableRowElement>) => {
                      event.preventDefault();
                      handleDrop(status.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isSystemStatus(status) ? <Lock className="h-4 w-4" aria-hidden="true" /> : <GripVertical className="h-4 w-4" aria-hidden="true" />}
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-4 font-medium">
                      <StatusLabel label={status.label} color={status.color} />
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">{status.description ?? "—"}</td>
                    <td className="py-4 text-right">
                      {status.org_id === null ? (
                        <span className="text-xs text-muted-foreground">System</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Open actions for ${status.label}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                openModal("createStatus", {
                                  statusId: status.id,
                                  defaultLabel: status.label,
                                  defaultDescription: status.description ?? "",
                                  defaultColor: status.color,
                                  onUpdated: handleStatusUpdated,
                                });
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                              Edit
                            </DropdownMenuItem>
                            {status.is_active ? (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={() => {
                                  openModal("deactivateStatus", {
                                    statusId: status.id,
                                    statusLabel: status.label,
                                    onDeactivated: handleStatusDeactivated,
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
                                  disabled={statusUpdatingId === status.id}
                                  onSelect={() => {
                                    void handleStatusActivated(status.id);
                                  }}
                                >
                                  <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {statusUpdatingId === status.id ? "Activating..." : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onSelect={() => {
                                    openModal("deleteStatus", {
                                      statusId: status.id,
                                      statusLabel: status.label,
                                      onDeleted: handleStatusDeleted,
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
                      )}
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
