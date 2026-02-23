export default function TicketsPage() {
  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Tickets</h2>
        <p className="text-sm text-zinc-500">All unsolved tickets in your workspace.</p>
      </div>

      <div className="grid h-full grid-cols-3 gap-4 overflow-hidden">
        {["Open Tickets", "Avg Ticket Age", "New Tickets"].map((card, index) => (
          <article key={card} className="rounded-2xl bg-emerald-100/70 p-6">
            <p className="text-sm text-zinc-600">{card}</p>
            <p className="mt-4 text-5xl font-bold">{index === 1 ? "1d 3h" : index === 2 ? 3 : 23}</p>
            <div className="mt-8 h-16 rounded-xl bg-gradient-to-r from-emerald-200 to-emerald-50" />
          </article>
        ))}
      </div>
    </section>
  );
}
