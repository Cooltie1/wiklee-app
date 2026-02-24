export default function TicketsPage() {
  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Tickets</h2>
        <p className="text-sm text-zinc-500">All unsolved tickets in your workspace.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Ticket metrics have been removed from this page.
      </div>
    </section>
  );
}
