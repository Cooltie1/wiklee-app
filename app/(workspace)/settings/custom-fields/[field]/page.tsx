import Link from "next/link";
import { notFound } from "next/navigation";

import { CategorySettingsTable } from "@/components/category-settings-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FieldConfig = {
  title: string;
  description: string;
  examples: string[];
};

const systemFieldDetails: Record<string, FieldConfig> = {
  priority: {
    title: "Priority",
    description: "Configure how urgency levels are named and ordered for tickets.",
    examples: ["Low", "Medium", "High", "Critical"],
  },
  category: {
    title: "Category",
    description: "Manage top-level categories that classify incoming work.",
    examples: ["Bug", "Feature Request", "Billing", "General Inquiry"],
  },
  status: {
    title: "Status",
    description: "Customize status values that represent your ticket workflow.",
    examples: ["New", "In Progress", "Pending", "Resolved"],
  },
};

export default async function SystemFieldPage({ params }: { params: Promise<{ field: string }> }) {
  const { field } = await params;
  const fieldConfig = systemFieldDetails[field];

  if (!fieldConfig) {
    notFound();
  }

  if (field === "category") {
    return <CategorySettingsTable />;
  }

  return (
    <section className="grid gap-4">
      <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/settings/custom-fields" className="hover:text-foreground hover:underline">
              Custom Fields
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{fieldConfig.title}</li>
        </ol>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">{fieldConfig.title}</h1>
        <p className="text-sm text-muted-foreground">{fieldConfig.description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{fieldConfig.title} options</CardTitle>
          <CardDescription>Placeholder values for this system field.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {fieldConfig.examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
