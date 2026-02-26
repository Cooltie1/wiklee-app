"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import { AvatarUploader } from "@/components/AvatarUploader";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  console.log("🔥 OnboardingPage rendered");
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Skip onboarding ONLY if:
  // - profile.first_name is set
  // - org.name is set
  useEffect(() => {
  (async () => {
    console.log("🚀 Onboarding check starting...");

    const { data: userData } = await supabase.auth.getUser();
    console.log("👤 userData:", userData);

    if (!userData.user) {
      console.log("❌ No user found, redirecting to login");
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("org_id, first_name, last_name, avatar_path")
      .eq("id", userData.user.id)
      .single();

    console.log("📄 profile:", profile);
    console.log("📄 profile error:", profileErr);

    if (profileErr) {
      setError(profileErr.message);
      setChecking(false);
      return;
    }

    let orgName = "";
    let orgData = null;

    if (profile?.org_id) {
      const { data: org, error: orgErr } = await supabase
        .from("orgs")
        .select("id, name")
        .eq("id", profile.org_id)
        .single();

      orgData = org;

      console.log("🏢 org:", org);
      console.log("🏢 org error:", orgErr);

      if (orgErr) {
        setError(orgErr.message);
        setChecking(false);
        return;
      }

      orgName = org?.name ?? "";
    } else {
      console.log("⚠️ profile has NO org_id");
    }

    const hasFirstName = !!profile?.first_name?.trim();
    const hasOrgName = !!orgName.trim();

    console.log("🧠 hasFirstName:", hasFirstName);
    console.log("🧠 hasOrgName:", hasOrgName);
    console.log("🧠 raw first_name:", profile?.first_name);
    console.log("🧠 raw orgName:", orgName);

    if (hasFirstName && hasOrgName) {
      console.log("✅ Skipping onboarding → redirecting home");
      router.replace("/");
      return;
    }

    console.log("➡️ Staying in onboarding");

    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setAvatarPath(profile?.avatar_path ?? null);
    setCompanyName(orgName);
    setUserId(userData.user.id);

    setStep(hasFirstName ? 2 : 1);

    setChecking(false);
  })();
}, [router]);

  function goToCompanyStep() {
    const trimmedFirstName = firstName.trim();

    if (!trimmedFirstName) {
      setError("Please enter your first name.");
      return;
    }

    setError(null);
    setStep(2);
  }

  async function saveOnboarding() {
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedCompanyName = companyName.trim();

    if (!trimmedFirstName) {
      setLoading(false);
      setError("Please enter your first name.");
      setStep(1);
      return;
    }

    if (!trimmedCompanyName) {
      setLoading(false);
      setError("Please enter a company name.");
      return;
    }

    // Fetch org_id (org should exist already)
    const { data: profile, error: profFetchErr } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profFetchErr || !profile?.org_id) {
      setLoading(false);
      setError(profFetchErr?.message ?? "Missing org for user.");
      return;
    }

    // 1) Update org name (no insert)
    const { error: orgErr } = await supabase
      .from("orgs")
      .update({ name: trimmedCompanyName })
      .eq("id", profile.org_id);

    if (orgErr) {
      setLoading(false);
      setError(orgErr.message);
      return;
    }

    // 2) Update profile personal info
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        first_name: trimmedFirstName,
        last_name: trimmedLastName || null,
      })
      .eq("id", user.id);

    setLoading(false);

    if (profErr) {
      setError(profErr.message);
      return;
    }

    router.replace("/");
  }

  if (checking) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{step === 1 ? "Tell us about you" : "Create your company"}</CardTitle>
          <CardDescription>
            Step {step} of 2: {step === 1 ? "Personal info" : "Company info"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            <>
              <div className="space-y-2">
                {userId ? (
                  <div className="flex justify-center pb-1">
                    <AvatarUploader
                      userId={userId}
                      name={`${firstName} ${lastName}`.trim()}
                      avatarPath={avatarPath}
                      sizeClassName="h-24 w-24"
                      onAvatarUpdated={setAvatarPath}
                    />
                  </div>
                ) : null}

                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={goToCompanyStep}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="company">Company name</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  aria-label="Back to personal info"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <Button className="flex-1" onClick={saveOnboarding} disabled={loading}>
                  {loading ? "Saving..." : "Create workspace"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}