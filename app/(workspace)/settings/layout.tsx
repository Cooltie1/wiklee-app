import SettingsSidebar from "@/components/settings-sidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="-m-6 grid h-full grid-cols-[240px_1fr] overflow-hidden bg-white">
      <aside className="h-full border-r border-zinc-200 bg-white p-6">
        <SettingsSidebar />
      </aside>

      <div className="h-full min-w-0 overflow-y-auto bg-white p-6">{children}</div>
    </section>
  );
}
