export default function AnalyticsPage() {
  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Analytics</h2>
        <p className="text-sm text-zinc-500">A high-level view of performance trends.</p>
      </div>

      <div className="grid h-full grid-cols-2 gap-4 overflow-hidden">
        <article className="rounded-2xl border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold">Ticket Throughput</h3>
          <div className="mt-4 h-64 rounded-xl bg-zinc-100" />
        </article>
        <article className="rounded-2xl border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold">Resolution by Team</h3>
          <div className="mt-4 h-64 rounded-xl bg-zinc-100" />
        </article>
      </div>
    </section>
  );
}
