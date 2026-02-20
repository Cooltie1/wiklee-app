"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) return setError(error.message);

    router.push("/app");
  }

  async function signUp() {
    setLoading(true);
    setError(null);

    const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/app`
      : undefined;

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
        emailRedirectTo: redirectUrl,
        },
    });

    setLoading(false);
    if (error) return setError(error.message);

    // If email confirmations are ON, user may need to confirm before they can sign in.
    router.push("/app");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Wiklee</CardTitle>
          <CardDescription>Sign in to manage tickets.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={/* signin vs signup doesn’t matter much here */ "current-password"}
                />
              </div>

              <TabsContent value="signin" className="m-0">
                <Button className="w-full" onClick={signIn} disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="m-0">
                <Button className="w-full" onClick={signUp} disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}