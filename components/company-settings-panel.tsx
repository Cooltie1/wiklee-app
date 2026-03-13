"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { normalizeRole } from "@/lib/roles";

type CompanyState = {
  orgId: string;
  companyName: string;
  workspaceUrl: string;
};

function sanitizeWorkspaceSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CompanySettingsPanel() {
  const [company, setCompany] = useState<CompanyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [canEditSettings, setCanEditSettings] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (userError || !user) {
        setError(userError?.message ?? "Unable to load workspace details.");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("org_id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData?.org_id) {
        setError(profileError?.message ?? "No organization linked to this profile.");
        setLoading(false);
        return;
      }

      setCanEditSettings(normalizeRole(profileData.role) === "admin");

      const { data: orgData, error: orgError } = await supabase
        .from("orgs")
        .select("id, name, slug")
        .eq("id", profileData.org_id)
        .single();

      if (orgError) {
        setError(orgError.message);
        setLoading(false);
        return;
      }

      setCompany({
        orgId: orgData.id,
        companyName: orgData.name ?? "",
        workspaceUrl: orgData.slug ?? "",
      });
      setLoading(false);
    })();
  }, []);

  async function saveCompanyDetails() {
    if (!company) {
      return;
    }

    if (!canEditSettings) {
      setError("You do not have permission to update company settings.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    const trimmedCompanyName = company.companyName.trim();
    const sanitizedWorkspaceUrl = sanitizeWorkspaceSlug(company.workspaceUrl);

    if (!trimmedCompanyName) {
      setError("Please enter a company name.");
      setSaving(false);
      return;
    }

    if (!sanitizedWorkspaceUrl) {
      setError("Please enter a workspace URL.");
      setSaving(false);
      return;
    }

    const { error: orgError } = await supabase
      .from("orgs")
      .update({
        name: trimmedCompanyName,
        slug: sanitizedWorkspaceUrl,
      })
      .eq("id", company.orgId);

    if (orgError) {
      setError(orgError.message);
      setSaving(false);
      return;
    }

    setCompany((prev) =>
      prev
        ? {
            ...prev,
            companyName: trimmedCompanyName,
            workspaceUrl: sanitizedWorkspaceUrl,
          }
        : prev
    );
    setSaveMessage("Company info updated.");
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading company info...</p>;
  }

  if (!company) {
    return <p className="text-sm text-destructive">{error ?? "Unable to load company info."}</p>;
  }

  return (
    <div className="grid gap-4 sm:max-w-md">
      <div className="grid gap-2">
        <Label htmlFor="companyName">Company name</Label>
        <Input
          id="companyName"
          value={company.companyName}
          onChange={(event) => {
            setCompany((prev) => (prev ? { ...prev, companyName: event.target.value } : prev));
            setSaveMessage(null);
            setError(null);
          }}
          disabled={saving || !canEditSettings}
          placeholder="Acme Inc"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="workspaceUrl">Workspace URL</Label>
        <div className="flex items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
          <Input
            id="workspaceUrl"
            value={company.workspaceUrl}
            onChange={(event) => {
              const nextWorkspaceUrl = sanitizeWorkspaceSlug(event.target.value);
              setCompany((prev) => (prev ? { ...prev, workspaceUrl: nextWorkspaceUrl } : prev));
              setSaveMessage(null);
              setError(null);
            }}
            disabled={saving || !canEditSettings}
            className="border-0 shadow-none focus-visible:ring-0"
            placeholder="acme"
          />
          <span className="px-3 text-sm text-muted-foreground">.wiklee.com</span>
        </div>
      </div>

      <Button onClick={saveCompanyDetails} disabled={saving || !canEditSettings} className="w-fit">
        {saving ? "Saving..." : "Save company info"}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
      {!canEditSettings ? <p className="text-sm text-muted-foreground">This section is read-only for agents.</p> : null}
    </div>
  );
}
