export default function SettingsPage() {
  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Settings</h2>
        <p className="text-sm text-zinc-500">Control workspace-level preferences.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <article className="rounded-2xl border border-zinc-200 p-6">
          <h3 className="font-semibold">Branding</h3>
          <p className="mt-2 text-sm text-zinc-500">Upload generic logos and define default colors.</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 p-6">
          <h3 className="font-semibold">Notifications</h3>
          <p className="mt-2 text-sm text-zinc-500">Manage who gets alerted about ticket updates.</p>
        </article>
      </div>
    </section>
  );
}
