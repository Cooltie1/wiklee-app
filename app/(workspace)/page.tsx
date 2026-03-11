"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { StatusLabel } from "@/components/status-label";
import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/lib/supabaseClient";
import { getUserDisplayName } from "@/lib/userDisplayName";
import { formatRelativeDateTime } from "@/lib/utils";
import { TicketStatusRow } from "@/lib/useModal";

type TicketRow = {
  id: string;
  ticket_number: number;
  title: string;
  created_at: string;
  updated_at: string;
  requester_id: string | null;
  owner_id: string | null;
  ticket_statuses: { label: string; color: TicketStatusRow["color"] } | { label: string; color: TicketStatusRow["color"] }[] | null;
  ticket_categories: { name: string } | { name: string }[] | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
};

function getStatus(status: TicketRow["ticket_statuses"]) {
  if (!status) return null;
  return Array.isArray(status) ? status[0] ?? null : status;
}

function getCategoryName(category: TicketRow["ticket_categories"]) {
  if (!category) return "—";
  return Array.isArray(category) ? category[0]?.name ?? "—" : category.name;
}

function getProfileName(profile?: ProfileRow) {
  if (!profile) return "—";
  return getUserDisplayName(profile);
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [sortKey, setSortKey] = useState<"ticket_number" | "title" | "status" | "category" | "requester" | "owner" | "created_at" | "updated_at">(
    "updated_at"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    async function loadWorkspaceData() {
      setLoading(true);
      setError(null);

      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, created_at, updated_at, requester_id, owner_id, ticket_statuses(label, color), ticket_categories(name)")
        .order("updated_at", { ascending: false });

      if (ticketError) {
        setError("Unable to load tickets.");
        setTickets([]);
        setProfilesById({});
        setLoading(false);
        return;
      }

      const loadedTickets = (ticketData ?? []) as TicketRow[];
      setTickets(loadedTickets);

      const userIds = Array.from(
        new Set(loadedTickets.flatMap((ticket) => [ticket.requester_id, ticket.owner_id]).filter(Boolean) as string[])
      );

      if (!userIds.length) {
        setProfilesById({});
        setLoading(false);
        return;
      }

      const { data: profilesData, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, avatar_path")
        .in("id", userIds);

      if (profileError) {
        setError("Unable to load tickets.");
        setProfilesById({});
        setLoading(false);
        return;
      }

      const profileMap = ((profilesData ?? []) as ProfileRow[]).reduce<Record<string, ProfileRow>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      setProfilesById(profileMap);
      setLoading(false);
    }

    void loadWorkspaceData();
  }, []);

  const sortedTickets = useMemo(() => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    const getComparableValue = (ticket: TicketRow) => {
      const requester = ticket.requester_id ? profilesById[ticket.requester_id] : undefined;
      const owner = ticket.owner_id ? profilesById[ticket.owner_id] : undefined;
      const status = getStatus(ticket.ticket_statuses)?.label ?? "";

      switch (sortKey) {
        case "ticket_number":
          return ticket.ticket_number;
        case "title":
          return ticket.title;
        case "status":
          return status;
        case "category":
          return getCategoryName(ticket.ticket_categories);
        case "requester":
          return getProfileName(requester);
        case "owner":
          return getProfileName(owner);
        case "created_at":
          return new Date(ticket.created_at).getTime();
        case "updated_at":
          return new Date(ticket.updated_at).getTime();
      }
    };

    return [...tickets].sort((a, b) => {
      const aValue = getComparableValue(a);
      const bValue = getComparableValue(b);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * directionMultiplier;
      }

      return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: "base" }) * directionMultiplier;
    });
  }, [profilesById, sortDirection, sortKey, tickets]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "updated_at" ? "desc" : "asc");
  };

  const getSortIndicator = (key: typeof sortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Open Tickets</h2>
      </div>

      <div className="overflow-auto rounded-2xl border border-zinc-200 p-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading tickets...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-zinc-500">No tickets found.</p>
        ) : (
          <table className="w-full min-w-[1120px] table-fixed text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="min-w-32 py-3"><button type="button" className="cursor-pointer" onClick={() => handleSort("ticket_number")}>Ticket Number{getSortIndicator("ticket_number")}</button></th>
                <th className="min-w-48 py-3"><button type="button" className="cursor-pointer" onClick={() => handleSort("title")}>Title{getSortIndicator("title")}</button></th>
                <th className="min-w-36 py-3"><button type="button" className="cursor-pointer" onClick={() => handleSort("status")}>Status{getSortIndicator("status")}</button></th>
                <th className="min-w-36 py-3"><button type="button" className="cursor-pointer" onClick={() => handleSort("category")}>Category{getSortIndicator("category")}</button></th>
                <th className="min-w-44 py-3"><button type="button" className="cursor-pointer" onClick={() => handleSort("requester")}>Requester{getSortIndicator("requester")}</button></th>
                <th className="min-w-44 py-3"><button type="button" className="cursor-pointer" onClick={() => handleSort("owner")}>Owner{getSortIndicator("owner")}</button></th>
                <th className="min-w-36 py-3"><button type="button" className="cursor-pointer" onClick={() => handleSort("created_at")}>Created At{getSortIndicator("created_at")}</button></th>
                <th className="min-w-36 py-3"><button type="button" className="cursor-pointer" onClick={() => handleSort("updated_at")}>Updated At{getSortIndicator("updated_at")}</button></th>
              </tr>
            </thead>
            <tbody>
              {sortedTickets.map((ticket) => {
                const requester = ticket.requester_id ? profilesById[ticket.requester_id] : undefined;
                const owner = ticket.owner_id ? profilesById[ticket.owner_id] : undefined;
                const status = getStatus(ticket.ticket_statuses);

                const handleOpenTicket = () => {
                  router.push(`/tickets/${ticket.id}`);
                };

                const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenTicket();
                  }
                };

                return (
                  <tr
                    key={ticket.id}
                    className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
                    onClick={handleOpenTicket}
                    onKeyDown={handleRowKeyDown}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ticket ${ticket.ticket_number}`}
                  >
                    <td className="max-w-0 truncate py-4 whitespace-nowrap">{ticket.ticket_number}</td>
                    <td className="max-w-0 truncate py-4 font-medium whitespace-nowrap">{ticket.title}</td>
                    <td className="max-w-0 truncate py-4 whitespace-nowrap">
                      {status ? <StatusLabel label={status.label} color={status.color} /> : "—"}
                    </td>
                    <td className="max-w-0 truncate py-4 whitespace-nowrap">{getCategoryName(ticket.ticket_categories)}</td>
                    <td className="py-4">
                      {requester ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <UserAvatar
                            userId={requester.id}
                            name={getProfileName(requester)}
                            avatarPath={requester.avatar_path}
                            className="size-7"
                          />
                          <span className="truncate">{getProfileName(requester)}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4">
                      {owner ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <UserAvatar
                            userId={owner.id}
                            name={getProfileName(owner)}
                            avatarPath={owner.avatar_path}
                            className="size-7"
                          />
                          <span className="truncate">{getProfileName(owner)}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-0 truncate py-4 whitespace-nowrap">{formatRelativeDateTime(ticket.created_at)}</td>
                    <td className="max-w-0 truncate py-4 whitespace-nowrap">{formatRelativeDateTime(ticket.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
