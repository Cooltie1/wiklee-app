import SettingsSidebar from "@/components/settings-sidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid h-full grid-cols-[240px_1fr] gap-6 overflow-hidden">
      <aside className="rounded-xl border bg-card p-4">
        <SettingsSidebar />
      </aside>

      <div className="min-w-0 overflow-y-auto pr-1">{children}</div>
    </section>
  );
}
