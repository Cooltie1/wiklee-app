"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      const isInvitedUser = user.user_metadata?.invited_to_org === true;
      const hasSetPassword = user.user_metadata?.has_set_password === true;

      if (!isInvitedUser || hasSetPassword) {
        router.replace("/");
        return;
      }

      setChecking(false);
    })();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const currentMetadata = userData.user?.user_metadata ?? {};

    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        ...currentMetadata,
        has_set_password: true,
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message ?? "Unable to set password.");
      return;
    }

    router.replace("/");
  };

  if (checking) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>Create a password to finish activating your invited account.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage ? (
            <Alert>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Set password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
