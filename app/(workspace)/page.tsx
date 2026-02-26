import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type TicketRow = {
  id: string;
  ticket_number: number;
  title: string;
  created_at: string;
  ticket_statuses: { label: string } | null;
  ticket_categories: { name: string } | null;
};

const createdAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return createdAtFormatter.format(date);
}

export default async function TicketsPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always set cookies.
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(
      "id, ticket_number, title, created_at, ticket_statuses(label), ticket_categories(name)"
    )
    .order("created_at", { ascending: false });

  const rows: TicketRow[] = tickets ?? [];

  console.log("[TicketsPage] Returned tickets length:", rows.length);
  console.log("[TicketsPage] Full ticket objects:", rows);

  if (error) {
    console.error("[TicketsPage] Supabase tickets query error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Tickets</h2>
        <p className="text-sm text-zinc-500">Track active support requests and ownership.</p>
      </div>

      <div className="overflow-auto rounded-2xl border border-zinc-200 p-4">
        {error ? (
          <p className="text-sm text-red-600">Unable to load tickets right now.</p>
        ) : rows.length === 0 ? (
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
              {rows.map((ticket) => (
                <tr key={ticket.id} className="border-b border-zinc-100 last:border-b-0">
                  <td className="py-4 font-medium">{ticket.ticket_number}</td>
                  <td className="py-4">{ticket.title}</td>
                  <td className="py-4">{ticket.ticket_statuses?.label ?? "—"}</td>
                  <td className="py-4">{ticket.ticket_categories?.name ?? "Uncategorized"}</td>
                  <td className="py-4">{formatCreatedAt(ticket.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
