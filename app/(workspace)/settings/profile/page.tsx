import { ProfileSettingsPanel } from "@/components/profile-settings-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsProfilePage() {
  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your personal profile preferences and account details.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Personal profile</CardTitle>
          <CardDescription>Update your name, avatar, and personal workspace preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSettingsPanel />
        </CardContent>
      </Card>
    </section>
  );
}
