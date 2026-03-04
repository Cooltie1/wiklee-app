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
  description: string | null;
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
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;

  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requesterUsers, setRequesterUsers] = useState<ComboboxUser[]>([]);
  const [ownerUsers, setOwnerUsers] = useState<ComboboxUser[]>([]);
  const [requesterId, setRequesterId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requesterLoadError, setRequesterLoadError] = useState("");
  const [ownerLoadError, setOwnerLoadError] = useState("");
  const [ownerDisabledMessage, setOwnerDisabledMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadTicket = async () => {
      if (!ticketId) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("tickets")
        .select("id, title, description, requester_id, owner_id, category_id")
        .eq("id", ticketId)
        .single();

      if (!isMounted) {
        return;
      }

      if (error || !data) {
        setErrorMessage("Unable to load ticket.");
        setTicket(null);
        setIsLoading(false);
        return;
      }

      const loadedTicket = data as TicketRow;
      setTicket(loadedTicket);
      setRequesterId(loadedTicket.requester_id);
      setOwnerId(loadedTicket.owner_id);
      setCategoryId(loadedTicket.category_id);
      setIsLoading(false);
    };

    void loadTicket();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

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

    void loadUsers();

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

  const updateTicketField = async (patch: Partial<TicketRow>) => {
    if (!ticketId) {
      return false;
    }

    setSaveError("");

    const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId);

    if (error) {
      setSaveError("Unable to save changes.");
      return false;
    }

    setTicket((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        ...patch,
      };
    });
    return true;
  };

  const handleRequesterChange = (nextRequesterId: string | null) => {
    const previousRequesterId = requesterId;
    setRequesterId(nextRequesterId);

    void updateTicketField({ requester_id: nextRequesterId }).then((didSave) => {
      if (!didSave) {
        setRequesterId(previousRequesterId);
      }
    });
  };

  const handleOwnerChange = (nextOwnerId: string | null) => {
    const previousOwnerId = ownerId;
    setOwnerId(nextOwnerId);

    void updateTicketField({ owner_id: nextOwnerId }).then((didSave) => {
      if (!didSave) {
        setOwnerId(previousOwnerId);
      }
    });
  };

  const handleCategoryChange = (nextCategoryId: string | null) => {
    const previousCategoryId = categoryId;
    setCategoryId(nextCategoryId);

    void updateTicketField({ category_id: nextCategoryId }).then((didSave) => {
      if (!didSave) {
        setCategoryId(previousCategoryId);
      }
    });
  };

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading ticket...</p>;
  }

  if (errorMessage || !ticket) {
    return <p className="text-sm text-red-600">{errorMessage ?? "Ticket not found."}</p>;
  }

  return (
    <section className="-m-6 grid h-[calc(100%+3rem)] min-h-0 grid-cols-[320px_1fr] overflow-hidden">
      <aside className="h-full overflow-y-auto border-r border-zinc-200 bg-white p-6">
        <div className="space-y-5">
          <RequesterSelect
            users={requesterUsers}
            value={requesterId}
            onChange={handleRequesterChange}
            disabled={isLoadingUsers || !requesterUsers.length}
            errorMessage={requesterLoadError}
          />

          <OwnerSelect
            users={ownerUsers}
            value={ownerId}
            currentUserId={currentUserId ?? ""}
            onChange={handleOwnerChange}
            disabled={isLoadingUsers || isOwnerDisabled}
            errorMessage={ownerLoadError}
            disabledMessage={ownerDisabledMessage}
          />

          <CategorySelect value={categoryId} onChange={handleCategoryChange} />

          {saveError ? <p className="text-xs text-red-600">{saveError}</p> : null}
        </div>
      </aside>

      <div className="min-h-0 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold">{ticket.title}</h1>
        {ticket.description ? <p className="mt-4 text-sm text-zinc-600">{ticket.description}</p> : null}
      </div>
    </section>
  );
}
