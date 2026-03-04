"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { OwnerSelect } from "@/components/OwnerSelect";
import { RequesterSelect } from "@/components/RequesterSelect";
import { CategorySelect } from "@/components/lookup/CategorySelect";
import type { ComboboxUser } from "@/components/UserCombobox";
import { getAvatarSignedUrl } from "@/lib/avatarSignedUrl";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  role: string | null;
};

type TicketRow = {
  id: string;
  title: string;
  description: string;
  requester_id: string | null;
  owner_id: string | null;
  category_id: string | null;
};

function userFromAuth(userId: string, firstName?: string | null, lastName?: string | null): ComboboxUser {
  return {
    id: userId,
    first_name: firstName ?? null,
    last_name: lastName ?? null,
    avatarUrl: null,
  };
}

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requesterUsers, setRequesterUsers] = useState<ComboboxUser[]>([]);
  const [ownerUsers, setOwnerUsers] = useState<ComboboxUser[]>([]);
  const [requesterId, setRequesterId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requesterLoadError, setRequesterLoadError] = useState("");
  const [ownerLoadError, setOwnerLoadError] = useState("");
  const [ownerDisabledMessage, setOwnerDisabledMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setSaveErrorMessage("");

      const [{ data: authData, error: authError }, { data: ticketData, error: ticketError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("tickets")
          .select("id, title, description, requester_id, owner_id, category_id")
          .eq("id", ticketId)
          .single(),
      ]);

      if (!isMounted) {
        return;
      }

      const currentUser = authData.user;

      if (authError || !currentUser) {
        setErrorMessage("Unable to load ticket details.");
        setIsLoading(false);
        return;
      }

      setCurrentUserId(currentUser.id);

      if (ticketError || !ticketData) {
        setErrorMessage("Unable to load ticket details.");
        setIsLoading(false);
        return;
      }

      const loadedTicket = ticketData as TicketRow;
      setTitle(loadedTicket.title);
      setDescription(loadedTicket.description);
      setRequesterId(loadedTicket.requester_id);
      setOwnerId(loadedTicket.owner_id);
      setCategoryId(loadedTicket.category_id);

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
        setIsLoading(false);
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
      setIsLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const isOwnerDisabled = useMemo(() => {
    if (!currentUserId || ownerDisabledMessage) {
      return true;
    }

    return false;
  }, [currentUserId, ownerDisabledMessage]);

  const updateTicket = async (nextValues: Partial<Pick<TicketRow, "requester_id" | "owner_id" | "category_id">>) => {
    setSaveErrorMessage("");
    setIsSaving(true);

    const { error } = await supabase.from("tickets").update(nextValues).eq("id", ticketId);

    setIsSaving(false);

    if (error) {
      setSaveErrorMessage("Unable to save ticket updates.");
      return false;
    }

    return true;
  };

  const handleRequesterChange = async (nextRequesterId: string | null) => {
    const previousRequesterId = requesterId;
    setRequesterId(nextRequesterId);
    const success = await updateTicket({ requester_id: nextRequesterId });

    if (!success) {
      setRequesterId(previousRequesterId);
    }
  };

  const handleOwnerChange = async (nextOwnerId: string | null) => {
    const previousOwnerId = ownerId;
    setOwnerId(nextOwnerId);
    const success = await updateTicket({ owner_id: nextOwnerId });

    if (!success) {
      setOwnerId(previousOwnerId);
    }
  };

  const handleCategoryChange = async (nextCategoryId: string | null) => {
    const previousCategoryId = categoryId;
    setCategoryId(nextCategoryId);
    const success = await updateTicket({ category_id: nextCategoryId });

    if (!success) {
      setCategoryId(previousCategoryId);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading ticket...</p>;
  }

  if (errorMessage) {
    return <p className="text-sm text-red-600">{errorMessage}</p>;
  }

  return (
    <section className="grid h-full grid-cols-[280px_1fr] gap-6 overflow-hidden">
      <aside className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
        <div className="space-y-4">
          <RequesterSelect
            users={requesterUsers}
            value={requesterId}
            onChange={handleRequesterChange}
            disabled={isLoading || isSaving || !requesterUsers.length}
            errorMessage={requesterLoadError}
          />

          <OwnerSelect
            users={ownerUsers}
            value={ownerId}
            currentUserId={currentUserId ?? ""}
            onChange={handleOwnerChange}
            disabled={isLoading || isSaving || isOwnerDisabled}
            errorMessage={ownerLoadError}
            disabledMessage={ownerDisabledMessage}
          />

          <CategorySelect value={categoryId} onChange={handleCategoryChange} />

          {isSaving ? <p className="text-xs text-zinc-500">Saving changes...</p> : null}
          {saveErrorMessage ? <p className="text-xs text-red-600">{saveErrorMessage}</p> : null}
        </div>
      </aside>

      <article className="min-h-0 overflow-auto rounded-2xl border border-zinc-200 p-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-6 whitespace-pre-wrap text-sm text-zinc-700">{description}</p>
      </article>
    </section>
  );
}
