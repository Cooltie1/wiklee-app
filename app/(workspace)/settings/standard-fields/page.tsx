import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const standardFields = [
  {
    name: "Priority",
    description: "Define urgency levels and how they are displayed in tickets.",
    href: "/settings/custom-fields/priority",
  },
  {
    name: "Category",
    description: "Organize incoming requests into high-level groups.",
    href: "/settings/custom-fields/category",
  },
  {
    name: "Status",
    description: "Control workflow states available to your team.",
    href: "/settings/custom-fields/status",
  },
];

export default function SettingsStandardFieldsPage() {
  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Standard Fields</h1>
        <p className="text-sm text-muted-foreground">Manage built-in fields used by all tickets in your workspace.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Standard Fields</CardTitle>
          <CardDescription>These core fields are used by all tickets in your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-3 font-medium">Field</th>
                <th className="py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {standardFields.map((field) => (
                <tr key={field.name} className="border-b last:border-0">
                  <td className="py-4 font-medium">
                    <Link href={field.href} className="text-emerald-700 hover:underline">
                      {field.name}
                    </Link>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">{field.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
