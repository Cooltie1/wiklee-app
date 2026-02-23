"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Circle,
  ChartColumn,
  FolderKanban,
  Settings,
  Users,
  Search,
  Sparkles,
  Hexagon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { href: "/", label: "Tickets", icon: FolderKanban },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("profile fetch error:", error.message);
        router.replace("/login");
        return;
      }

      if (!profile?.org_id) {
        router.replace("/onboarding");
        return;
      }

      setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return <div className="flex h-screen w-screen items-center justify-center">Loading workspace...</div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-100 p-4 text-zinc-900">
      <div className="grid h-full w-full grid-cols-[80px_1fr] rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <aside className="sticky top-0 h-full border-r border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-6 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Hexagon className="h-5 w-5" />
            </div>
          </div>

          <nav className="flex flex-col items-center gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                    isActive
                      ? "border-emerald-300 bg-emerald-200 text-zinc-900"
                      : "border-transparent bg-white text-zinc-600 hover:border-zinc-200 hover:bg-zinc-100"
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="grid h-full grid-rows-[72px_1fr] overflow-hidden">
          <header className="sticky top-0 flex items-center justify-between border-b border-zinc-200 px-6">
            <h1 className="text-xl font-semibold">Wiklee Desk</h1>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-72 items-center gap-2 rounded-full border border-zinc-200 px-3 text-zinc-500">
                <Search className="h-4 w-4" />
                <span className="text-sm">Search tickets, users, articles...</span>
              </div>

              <button className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-100">
                <Circle className="h-4 w-4" />
              </button>

              <button className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-100">
                <Sparkles className="h-4 w-4" />
              </button>

              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-900 text-white"
                aria-label="Workspace logo"
              >
                <Hexagon className="h-4 w-4" />
              </div>
            </div>
          </header>

          <main className="h-full overflow-hidden p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
