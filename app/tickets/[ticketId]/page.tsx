"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import AppShell from "@/components/app-shell";
import { OwnerSelect } from "@/components/OwnerSelect";
import { RequesterSelect } from "@/components/RequesterSelect";
import type { ComboboxUser } from "@/components/UserCombobox";
import { CategorySelect } from "@/components/lookup/CategorySelect";
import { getAvatarSignedUrl } from "@/lib/avatarSignedUrl";
import { supabase } from "@/lib/supabaseClient";
import { useFieldAutosave } from "@/lib/useFieldAutosave";

type TicketRow = {
  id: string;
  title: string;
  description: string | null;
  requester_id: string | null;
  owner_id: string | null;
  category_id: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  role: string | null;
};

type TicketDetailContentProps = {
  ticket: TicketRow;
  currentUserId: string | null;
  requesterUsers: ComboboxUser[];
  ownerUsers: ComboboxUser[];
};

async function updateTicketField(ticketId: string, patch: Partial<Pick<TicketRow, "requester_id" | "owner_id" | "category_id">>) {
  const { count, error } = await supabase.from("tickets").update(patch, { count: "exact" }).eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }

  if (count !== 1) {
    throw new Error("Unable to save changes.");
  }
}

function TicketDetailContent({ ticket, currentUserId, requesterUsers, ownerUsers }: TicketDetailContentProps) {
  const requesterAutosave = useFieldAutosave<string | null>({
    initialValue: ticket.requester_id,
    onSave: async (nextValue) => {
      await updateTicketField(ticket.id, { requester_id: nextValue });
    },
  });

  const ownerAutosave = useFieldAutosave<string | null>({
    initialValue: ticket.owner_id,
    onSave: async (nextValue) => {
      await updateTicketField(ticket.id, { owner_id: nextValue });
    },
  });

  const categoryAutosave = useFieldAutosave<string | null>({
    initialValue: ticket.category_id,
    onSave: async (nextValue) => {
      await updateTicketField(ticket.id, { category_id: nextValue });
    },
  });

  const isAnySaving = [requesterAutosave.status, ownerAutosave.status, categoryAutosave.status].includes("saving");
  const isAnySaved = [requesterAutosave.status, ownerAutosave.status, categoryAutosave.status].includes("saved");
  const autosaveError = requesterAutosave.errorMessage || ownerAutosave.errorMessage || categoryAutosave.errorMessage;

  const sidebarStatus = useMemo(() => {
    if (isAnySaving) return "Saving...";
    if (autosaveError) return "Unable to save changes";
    if (isAnySaved) return "Saved";
    return "";
  }, [autosaveError, isAnySaved, isAnySaving]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_1fr] overflow-hidden bg-white">
      <aside className="h-full border-r border-zinc-200 bg-white p-6">
        <div className="space-y-4">
          <RequesterSelect
            users={requesterUsers}
            value={requesterAutosave.currentValue}
            onChange={requesterAutosave.setValue}
            disabled={!requesterUsers.length}
          />
          <OwnerSelect
            users={ownerUsers}
            value={ownerAutosave.currentValue}
            currentUserId={currentUserId}
            onChange={ownerAutosave.setValue}
            disabled={!ownerUsers.length}
          />
          <CategorySelect value={categoryAutosave.currentValue} onChange={categoryAutosave.setValue} />
        </div>

        <div className="mt-6 space-y-1 text-xs">
          {sidebarStatus ? <p className="text-zinc-500">{sidebarStatus}</p> : null}
          {autosaveError ? <p className="text-red-600">{autosaveError}</p> : null}
        </div>
      </aside>

      <div className="h-full overflow-auto bg-white p-6">
        <h1 className="text-3xl font-bold">{ticket.title}</h1>
        <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700">{ticket.description || "No description provided."}</p>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;

  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [requesterUsers, setRequesterUsers] = useState<ComboboxUser[]>([]);
  const [ownerUsers, setOwnerUsers] = useState<ComboboxUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTicketPageData() {
      setIsLoading(true);
      setLoadError("");

      const [{ data: authData }, { data: ticketData, error: ticketError }, { data: profileData, error: profileError }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("tickets")
            .select("id, title, description, requester_id, owner_id, category_id")
            .eq("id", ticketId)
            .single(),
          supabase.from("profiles").select("id, first_name, last_name, avatar_path, role"),
        ]);

      if (!isMounted) return;

      if (ticketError || !ticketData || profileError) {
        setLoadError("We couldn't load this ticket. Please refresh or try another ticket.");
        setIsLoading(false);
        return;
      }

      setCurrentUserId(authData.user?.id ?? null);
      setTicket(ticketData as TicketRow);

      const usersWithAvatars = await Promise.all(
        ((profileData ?? []) as ProfileRow[]).map(async (profile) => {
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

      if (!isMounted) return;

      setRequesterUsers(
        usersWithAvatars.map((user) => ({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          avatarUrl: user.avatarUrl,
        }))
      );
      setOwnerUsers(
        usersWithAvatars
          .filter((user) => user.role === "agent")
          .map((user) => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            avatarUrl: user.avatarUrl,
          }))
      );
      setIsLoading(false);
    }

    void loadTicketPageData();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  return (
    <AppShell>
      <section className="-m-6 h-full overflow-hidden">
        {isLoading ? (
          <div className="h-full bg-white p-6 text-sm text-zinc-500">Loading ticket...</div>
        ) : loadError || !ticket ? (
          <div className="h-full bg-white p-6 text-sm text-red-700">
            {loadError || "We couldn't load this ticket."}
          </div>
        ) : (
          <TicketDetailContent
            key={ticket.id}
            ticket={ticket}
            currentUserId={currentUserId}
            requesterUsers={requesterUsers}
            ownerUsers={ownerUsers}
          />
        )}
      </section>
    </AppShell>
  );
}
