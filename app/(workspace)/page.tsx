const tickets = [
  {
    id: "TKT-1041",
    subject: "Login loop after password reset",
    status: "In Progress",
    priority: "High",
    assignee: "Jane Doe",
    updated: "2h ago",
  },
  {
    id: "TKT-1038",
    subject: "Exported reports missing rows",
    status: "Open",
    priority: "Medium",
    assignee: "John Smith",
    updated: "5h ago",
  },
  {
    id: "TKT-1035",
    subject: "Unable to invite teammate",
    status: "Pending",
    priority: "Low",
    assignee: "Freddy Mercury",
    updated: "1d ago",
  },
  {
    id: "TKT-1032",
    subject: "Mobile layout overlap in ticket detail",
    status: "Resolved",
    priority: "Medium",
    assignee: "Alex Johnson",
    updated: "2d ago",
  },
];

export default function TicketsPage() {
  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Tickets</h2>
        <p className="text-sm text-zinc-500">Track active support requests and ownership.</p>
      </div>

      <div className="overflow-auto rounded-2xl border border-zinc-200 p-4">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-3">Ticket</th>
              <th className="py-3">Subject</th>
              <th className="py-3">Status</th>
              <th className="py-3">Priority</th>
              <th className="py-3">Assignee</th>
              <th className="py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-zinc-100 last:border-b-0">
                <td className="py-4 font-medium">{ticket.id}</td>
                <td className="py-4">{ticket.subject}</td>
                <td className="py-4">{ticket.status}</td>
                <td className="py-4">{ticket.priority}</td>
                <td className="py-4">{ticket.assignee}</td>
                <td className="py-4">{ticket.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
