"use client";

import { useEffect, useMemo, useState } from "react";

import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/lib/supabaseClient";

type TicketRow = {
  id: string;
  ticket_number: number;
  title: string;
  created_at: string;
  requester_id: string | null;
  owner_id: string | null;
  ticket_statuses: { label: string } | { label: string }[] | null;
  ticket_categories: { name: string } | { name: string }[] | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
};

function getStatusLabel(status: TicketRow["ticket_statuses"]) {
  if (!status) return "—";
  return Array.isArray(status) ? status[0]?.label ?? "—" : status.label;
}

function getCategoryName(category: TicketRow["ticket_categories"]) {
  if (!category) return "Uncategorized";
  return Array.isArray(category) ? category[0]?.name ?? "Uncategorized" : category.name;
}

function getProfileName(profile?: ProfileRow) {
  if (!profile) return "—";

  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return fullName || "Unknown User";
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  useEffect(() => {
    async function loadWorkspaceData() {
      setLoading(true);
      setError(null);

      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, created_at, requester_id, owner_id, ticket_statuses(label), ticket_categories(name)")
        .order("created_at", { ascending: false });

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
        .select("id, first_name, last_name, avatar_path")
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
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-3">Ticket Number</th>
                <th className="py-3">Title</th>
                <th className="py-3">Status</th>
                <th className="py-3">Category</th>
                <th className="py-3">Requester</th>
                <th className="py-3">Owner</th>
                <th className="py-3">Created At</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const requester = ticket.requester_id ? profilesById[ticket.requester_id] : undefined;
                const owner = ticket.owner_id ? profilesById[ticket.owner_id] : undefined;

                return (
                  <tr key={ticket.id} className="border-b border-zinc-100">
                    <td className="py-4">{ticket.ticket_number}</td>
                    <td className="py-4 font-medium">{ticket.title}</td>
                    <td className="py-4">{getStatusLabel(ticket.ticket_statuses)}</td>
                    <td className="py-4">{getCategoryName(ticket.ticket_categories)}</td>
                    <td className="py-4">
                      {requester ? (
                        <span className="flex items-center gap-2">
                          <UserAvatar
                            userId={requester.id}
                            name={getProfileName(requester)}
                            avatarPath={requester.avatar_path}
                            className="size-7"
                          />
                          <span>{getProfileName(requester)}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4">
                      {owner ? (
                        <span className="flex items-center gap-2">
                          <UserAvatar
                            userId={owner.id}
                            name={getProfileName(owner)}
                            avatarPath={owner.avatar_path}
                            className="size-7"
                          />
                          <span>{getProfileName(owner)}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4">{dateFormatter.format(new Date(ticket.created_at))}</td>
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
