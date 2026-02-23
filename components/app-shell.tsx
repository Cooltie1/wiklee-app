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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navItems = [
  { href: "/", label: "Tickets", icon: FolderKanban },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

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
    <div className="h-screen w-screen overflow-hidden bg-muted/40 p-4 text-foreground">
      <div className="grid h-full w-full grid-cols-[84px_1fr] overflow-hidden rounded-2xl border bg-background shadow-sm">
        <aside className="sticky top-0 h-full border-r bg-muted/30 p-3">
          <div className="mb-6 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Hexagon className="h-5 w-5" />
            </div>
          </div>

          <nav className="flex flex-col items-center gap-2" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(pathname, item.href);

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  size="icon"
                  className={`h-11 w-11 rounded-xl ${active ? "bg-emerald-200 hover:bg-emerald-200" : ""}`}
                >
                  <Link href={item.href} aria-label={item.label}>
                    <Icon className="h-5 w-5" />
                  </Link>
                </Button>
              );
            })}
          </nav>
        </aside>

        <div className="grid h-full grid-rows-[72px_1fr] overflow-hidden">
          <header className="sticky top-0 flex items-center justify-between border-b px-6">
            <h1 className="text-xl font-semibold">Wiklee Desk</h1>

            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  readOnly
                  value="Search tickets, users, articles..."
                  className="h-10 rounded-full pr-3 pl-9 text-sm text-muted-foreground"
                  aria-label="Search"
                />
              </div>

              <Button variant="outline" size="icon" className="rounded-full" aria-label="Updates">
                <Circle className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" className="rounded-full" aria-label="Highlights">
                <Sparkles className="h-4 w-4" />
              </Button>

              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border bg-primary text-primary-foreground"
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
