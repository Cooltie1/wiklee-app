import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsBillingPage() {
  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Review plan details, invoices, and workspace billing settings.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Subscription & invoices</CardTitle>
          <CardDescription>Manage your subscription and keep payment information up to date.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </CardContent>
      </Card>
    </section>
  );
}
