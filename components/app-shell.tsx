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
  ChevronDown,
  LogOut,
  UserCog,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [signingOut, setSigningOut] = useState(false);

  const isUsersPage = pathname === "/users" || pathname.startsWith("/users/") || pathname === "/team" || pathname.startsWith("/team/");
  const createButtonLabel = isUsersPage ? "+ Create User" : "+ Create Ticket";
  const createButtonHref = isUsersPage ? "/users/new" : "/tickets/new";

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

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
    setSigningOut(false);
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="grid h-full w-full grid-cols-[72px_1fr] overflow-hidden bg-background">
        <aside className="sticky top-0 h-full border-r bg-muted/30 p-2">
          <div className="mb-4 flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hexagon className="h-4 w-4" />
            </div>
          </div>

          <nav className="flex flex-col items-center gap-1.5" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(pathname, item.href);

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  size="icon"
                  className={`h-10 w-10 rounded-lg ${active ? "bg-emerald-200 hover:bg-emerald-200" : ""}`}
                >
                  <Link href={item.href} aria-label={item.label}>
                    <Icon className="h-4 w-4" />
                  </Link>
                </Button>
              );
            })}
          </nav>
        </aside>

        <div className="grid h-full grid-rows-[60px_1fr] overflow-hidden">
          <header className="sticky top-0 flex items-center justify-between border-b px-4">
            <div className="flex items-center gap-1">
              <Button asChild className="h-9 rounded-sm rounded-l-full px-4">
                <Link href={createButtonHref}>{createButtonLabel}</Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" className="h-9 w-9 rounded-l-none rounded-r-full" aria-label="Open create menu">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/tickets/new">+ Create Ticket</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/users/new">+ Create User</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  readOnly
                  value="Search tickets, users, articles..."
                  className="h-9 rounded-full pr-3 pl-9 text-sm text-muted-foreground"
                  aria-label="Search"
                />
              </div>

              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" aria-label="Updates">
                <Circle className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" aria-label="Highlights">
                <Sparkles className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    aria-label="Open profile menu"
                  >
                    <Hexagon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/settings/profile">
                      <UserCog className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {signingOut ? "Signing out..." : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="h-full overflow-hidden p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
