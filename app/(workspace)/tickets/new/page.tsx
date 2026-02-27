"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { OwnerSelect } from "@/components/OwnerSelect";
import { RequesterSelect } from "@/components/RequesterSelect";
import type { ComboboxUser } from "@/components/UserCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAvatarSignedUrl } from "@/lib/avatarSignedUrl";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  role: string | null;
};

function userFromAuth(userId: string, firstName?: string | null, lastName?: string | null): ComboboxUser {
  return {
    id: userId,
    first_name: firstName ?? null,
    last_name: lastName ?? null,
    avatarUrl: null,
  };
}

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requesterUsers, setRequesterUsers] = useState<ComboboxUser[]>([]);
  const [ownerUsers, setOwnerUsers] = useState<ComboboxUser[]>([]);
  const [requesterId, setRequesterId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [requesterLoadError, setRequesterLoadError] = useState("");
  const [ownerLoadError, setOwnerLoadError] = useState("");
  const [ownerDisabledMessage, setOwnerDisabledMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      setRequesterLoadError("");
      setOwnerLoadError("");
      setOwnerDisabledMessage("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const currentUser = authData.user;

      if (!isMounted) {
        return;
      }

      if (authError || !currentUser) {
        setRequesterLoadError("Unable to load users");
        setOwnerLoadError("Unable to load users");
        setOwnerDisabledMessage("Only agents can assign owners");
        setIsLoadingUsers(false);
        return;
      }

      setCurrentUserId(currentUser.id);
      setRequesterId((previous) => previous ?? currentUser.id);

      const fallbackCurrentUser = userFromAuth(
        currentUser.id,
        currentUser.user_metadata?.first_name,
        currentUser.user_metadata?.last_name
      );

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_path, role");

      if (!isMounted) {
        return;
      }

      if (profileError) {
        setRequesterUsers([fallbackCurrentUser]);
        setOwnerUsers([]);
        setRequesterLoadError("Unable to load users");
        setOwnerLoadError("Unable to load users");
        setOwnerDisabledMessage("Only agents can assign owners");
        setIsLoadingUsers(false);
        return;
      }

      const rows = (profiles ?? []) as ProfileRow[];
      const usersWithAvatars = await Promise.all(
        rows.map(async (profile) => {
          let avatarUrl: string | null = null;

          if (profile.avatar_path) {
            try {
              avatarUrl = await getAvatarSignedUrl(supabase, profile.avatar_path, 3600);
            } catch {
              avatarUrl = null;
            }
          }

          return {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatarUrl,
            role: profile.role,
          };
        })
      );

      if (!isMounted) {
        return;
      }

      const requesterList = usersWithAvatars.length
        ? usersWithAvatars.map((user) => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            avatarUrl: user.avatarUrl,
          }))
        : [fallbackCurrentUser];

      const hasCurrentUser = requesterList.some((user) => user.id === currentUser.id);
      const normalizedRequesterList = hasCurrentUser ? requesterList : [fallbackCurrentUser, ...requesterList];

      const owners = usersWithAvatars
        .filter((user) => user.role === "agent")
        .map((user) => ({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          avatarUrl: user.avatarUrl,
        }));

      setRequesterUsers(normalizedRequesterList);
      setOwnerUsers(owners);
      setIsLoadingUsers(false);
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const isOwnerDisabled = useMemo(() => {
    if (!currentUserId || ownerDisabledMessage) {
      return true;
    }

    return false;
  }, [currentUserId, ownerDisabledMessage]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!currentUserId) {
      setErrorMessage("Unable to determine current user.");
      return;
    }

    const resolvedRequesterId = requesterId ?? currentUserId;

    setIsSaving(true);

    const { error } = await supabase.from("tickets").insert({
      title,
      description,
      requester_id: resolvedRequesterId,
      owner_id: ownerId,
    });

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/");
  };

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6">
      <h2 className="text-3xl font-bold">Create Ticket</h2>
      <p className="mt-2 text-sm text-zinc-500">Start a new support ticket for your workspace.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ticket title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue"
            className="min-h-32 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </div>

        <RequesterSelect
          users={requesterUsers}
          value={requesterId}
          onChange={setRequesterId}
          disabled={isLoadingUsers || !requesterUsers.length}
          errorMessage={requesterLoadError}
        />

        <OwnerSelect
          users={ownerUsers}
          value={ownerId}
          currentUserId={currentUserId ?? ""}
          onChange={setOwnerId}
          disabled={isLoadingUsers || isOwnerDisabled}
          errorMessage={ownerLoadError}
          disabledMessage={ownerDisabledMessage}
        />

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <Button type="submit" disabled={isSaving || isLoadingUsers || !currentUserId}>
          {isSaving ? "Creating..." : "Create Ticket"}
        </Button>
      </form>
    </section>
  );
}
