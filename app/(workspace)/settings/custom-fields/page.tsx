import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
        <p className="text-sm text-muted-foreground">Create and manage additional fields specific to your workflow.</p>
      </header>

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
