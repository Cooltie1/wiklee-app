import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySettingsPanel } from "@/components/company-settings-panel";

export default function SettingsCompanyPage() {
  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Company Info</h1>
        <p className="text-sm text-muted-foreground">Manage organization details and default workspace information.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
          <CardDescription>Update your company name and workspace URL.</CardDescription>
        </CardHeader>
        <CardContent>
          <CompanySettingsPanel />
        </CardContent>
      </Card>
    </section>
  );
}
