"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

type TicketRow = {
  id: string;
  ticket_number: number;
  title: string;
  created_at: string;
  ticket_statuses: { label: string } | { label: string }[] | null;
  ticket_categories: { name: string } | { name: string }[] | null;
};

function getStatusLabel(status: TicketRow["ticket_statuses"]) {
  if (!status) return "—";
  return Array.isArray(status) ? status[0]?.label ?? "—" : status.label;
}

function getCategoryName(category: TicketRow["ticket_categories"]) {
  if (!category) return "Uncategorized";
  return Array.isArray(category) ? category[0]?.name ?? "Uncategorized" : category.name;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
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
        .select("id, ticket_number, title, created_at, ticket_statuses(label), ticket_categories(name)")
        .order("created_at", { ascending: false });

      if (ticketError) {
        setError("Unable to load tickets.");
        setTickets([]);
        setLoading(false);
        return;
      }

      setTickets((ticketData ?? []) as TicketRow[]);
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
                <th className="py-3">Created At</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-zinc-100">
                  <td className="py-4">{ticket.ticket_number}</td>
                  <td className="py-4 font-medium">{ticket.title}</td>
                  <td className="py-4">{getStatusLabel(ticket.ticket_statuses)}</td>
                  <td className="py-4">{getCategoryName(ticket.ticket_categories)}</td>
                  <td className="py-4">{dateFormatter.format(new Date(ticket.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
