"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AvatarUploader } from "@/components/AvatarUploader";
import { ArrowLeft } from "lucide-react";

export default function OnboardingPage() {
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

  // If they already have an org, skip onboarding
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("org_id, first_name, last_name, avatar_path")
        .eq("id", userData.user.id)
        .single();

      if (profileErr) {
        setError(profileErr.message);
        setChecking(false);
        return;
      }

      if (profile?.org_id) {
        router.replace("/");
        return;
      }

      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      setAvatarPath(profile?.avatar_path ?? null);
      setUserId(userData.user.id);
      setChecking(false);
    })();
  }, [router]);

  function goToCompanyStep() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError("Please enter your first and last name.");
      return;
    }

    setError(null);
    setStep(2);
  }

  async function createOrgAndAttach() {
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

    if (!trimmedFirstName || !trimmedLastName) {
      setLoading(false);
      setError("Please enter your first and last name.");
      setStep(1);
      return;
    }

    if (!trimmedCompanyName) {
      setLoading(false);
      setError("Please enter a company name.");
      return;
    }

    // 1) Create org
    const { data: org, error: orgErr } = await supabase
      .from("orgs")
      .insert({ name: trimmedCompanyName })
      .select("id")
      .single();

    if (orgErr || !org) {
      setLoading(false);
      setError(orgErr?.message ?? "Failed to create org.");
      return;
    }

    // 2) Attach user profile to org and save personal info
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        org_id: org.id,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
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
                <Button className="flex-1" onClick={createOrgAndAttach} disabled={loading}>
                  {loading ? "Creating..." : "Create workspace"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
