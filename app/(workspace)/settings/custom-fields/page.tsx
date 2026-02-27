import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const systemFields = [
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

const customFields = [
  { name: "Affected Service", type: "Dropdown", appliesTo: "Ticket", updatedAt: "2 days ago" },
  { name: "Customer Tier", type: "Single Select", appliesTo: "Company", updatedAt: "4 days ago" },
  { name: "Release Window", type: "Date", appliesTo: "Ticket", updatedAt: "1 week ago" },
];

export default function SettingsCustomFieldsPage() {
  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Custom Fields</h1>
        <p className="text-sm text-muted-foreground">Manage built-in system fields and team-defined fields.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>System Fields</CardTitle>
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
              {systemFields.map((field) => (
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>Create and manage additional fields specific to your workflow.</CardDescription>
          </div>
          <Button>Create New Field</Button>
        </CardHeader>
        <CardContent>
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-3 font-medium">Field</th>
                <th className="py-3 font-medium">Type</th>
                <th className="py-3 font-medium">Applies To</th>
                <th className="py-3 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {customFields.map((field) => (
                <tr key={field.name} className="border-b last:border-0">
                  <td className="py-4 font-medium">{field.name}</td>
                  <td className="py-4">{field.type}</td>
                  <td className="py-4">{field.appliesTo}</td>
                  <td className="py-4 text-sm text-muted-foreground">{field.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
