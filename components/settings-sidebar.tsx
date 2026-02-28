"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mainSettingsNavItems = [
  { href: "/settings/profile", label: "Profile Settings" },
  { href: "/settings/company", label: "Company Info" },
  { href: "/settings/billing", label: "Billing" },
];

const fieldSettingsNavItems = [
  { href: "/settings/standard-fields", label: "Standard Fields" },
  { href: "/settings/custom-fields", label: "Custom Fields" },
];

export default function SettingsSidebar() {
  const pathname = usePathname();

  const renderNavButton = (item: { href: string; label: string }) => {
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
  };

  return (
    <nav className="flex flex-col gap-2" aria-label="Settings sections">
      {mainSettingsNavItems.map(renderNavButton)}

      <div className="mt-5">
        <p className="mb-2 text-left text-sm font-bold text-foreground">Field Settings</p>
        <div className="flex flex-col gap-2">{fieldSettingsNavItems.map(renderNavButton)}</div>
      </div>
    </nav>
  );
}
