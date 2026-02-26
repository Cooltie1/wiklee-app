"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const settingsNavItems = [
  { href: "/settings/profile", label: "Profile Settings" },
  { href: "/settings/company", label: "Company Info" },
  { href: "/settings/custom-fields", label: "Custom Fields" },
  { href: "/settings/billing", label: "Billing" },
];

export default function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2" aria-label="Settings sections">
      {settingsNavItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "secondary" : "ghost"}
            className={cn("w-full justify-start", isActive ? "bg-emerald-200 hover:bg-emerald-200" : "")}
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
