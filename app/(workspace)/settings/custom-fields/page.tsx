import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsCustomFieldsPage() {
  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Custom Fields</h1>
        <p className="text-sm text-muted-foreground">Configure custom metadata fields for tickets and related records.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Field management</CardTitle>
          <CardDescription>Create, edit, and organize custom fields used across your workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </CardContent>
      </Card>
    </section>
  );
}
