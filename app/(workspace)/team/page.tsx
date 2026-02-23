export default function TeamPage() {
  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Team</h2>
        <p className="text-sm text-zinc-500">Agents and workload at a glance.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 p-4">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-3">Agent</th>
              <th className="py-3">Open Tickets</th>
              <th className="py-3">SLA Health</th>
            </tr>
          </thead>
          <tbody>
            {["Jane Doe", "John Smith", "Freddy Mercury"].map((name, idx) => (
              <tr key={name} className="border-b border-zinc-100">
                <td className="py-4 font-medium">{name}</td>
                <td className="py-4">{[7, 4, 6][idx]}</td>
                <td className="py-4">{["Good", "Warning", "Good"][idx]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
