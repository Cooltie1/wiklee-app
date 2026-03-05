"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import AppShell from "@/components/app-shell";
import { OwnerSelect } from "@/components/OwnerSelect";
import { RequesterSelect } from "@/components/RequesterSelect";
import { Button } from "@/components/ui/button";
import type { ComboboxUser } from "@/components/UserCombobox";
import { CategorySelect } from "@/components/lookup/CategorySelect";
import { PrioritySelect } from "@/components/lookup/PrioritySelect";
import { StatusSelect } from "@/components/lookup/StatusSelect";
import { Input } from "@/components/ui/input";
import { getAvatarSignedUrl } from "@/lib/avatarSignedUrl";
import { supabase } from "@/lib/supabaseClient";
import { useFieldAutosave } from "@/lib/useFieldAutosave";

type TicketRow = {
  id: string;
  ticket_number: number;
  title: string;
  description: string | null;
  requester_id: string | null;
  owner_id: string | null;
  category_id: string | null;
  priority_id: string | null;
  status_id: string | null;
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

function TicketReplyEditor() {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorHtml, setEditorHtml] = useState("");

  function updateEditorHeight() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.style.height = "auto";
    const nextHeight = Math.min(editor.scrollHeight, 220);
    editor.style.height = `${Math.max(nextHeight, 40)}px`;
    editor.style.overflowY = editor.scrollHeight > 220 ? "auto" : "hidden";
  }

  function handleInput() {
    const nextHtml = editorRef.current?.innerHTML ?? "";
    setEditorHtml(nextHtml);
    updateEditorHeight();
  }

  function handleSend() {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = "";
    setEditorHtml("");
    updateEditorHeight();
    editorRef.current.focus();
  }

  const isEmpty = !editorHtml.replace(/<br\s*\/?>(?=\s*<\/div>|$)/gi, "").replace(/<[^>]+>/g, "").trim();

  return (
    <div className="relative rounded-xl border border-zinc-300 bg-white shadow-sm transition focus-within:border-zinc-400">
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label="Reply to ticket"
        data-placeholder="Write a reply..."
        className="max-h-[220px] min-h-10 w-full overflow-hidden px-3 py-2 pr-20 text-sm outline-none empty:before:pointer-events-none empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)]"
        onInput={handleInput}
      />

      <Button
        type="button"
        size="sm"
        className="absolute bottom-2 right-2 h-7 rounded-md px-3"
        onClick={handleSend}
        disabled={isEmpty}
      >
        Send
      </Button>
    </div>
  );
}

function TicketDetailContent({ ticket, currentUserId, requesterUsers, ownerUsers }: TicketDetailContentProps) {
  const requesterAutosave = useFieldAutosave<string | null>({
    initialValue: ticket.requester_id,
    onSave: async (nextValue) => {
      const { error } = await supabase.from("tickets").update({ requester_id: nextValue }).eq("id", ticket.id);
      if (error) throw new Error(error.message);
    },
  });

  const ownerAutosave = useFieldAutosave<string | null>({
    initialValue: ticket.owner_id,
    onSave: async (nextValue) => {
      const { error } = await supabase.from("tickets").update({ owner_id: nextValue }).eq("id", ticket.id);
      if (error) throw new Error(error.message);
    },
  });

  const categoryAutosave = useFieldAutosave<string | null>({
    initialValue: ticket.category_id,
    onSave: async (nextValue) => {
      const { error } = await supabase.from("tickets").update({ category_id: nextValue }).eq("id", ticket.id);
      if (error) throw new Error(error.message);
    },
  });

  const priorityAutosave = useFieldAutosave<string | null>({
    initialValue: ticket.priority_id,
    onSave: async (nextValue) => {
      const { error } = await supabase.from("tickets").update({ priority_id: nextValue }).eq("id", ticket.id);
      if (error) throw new Error(error.message);
    },
  });

  const statusAutosave = useFieldAutosave<string | null>({
    initialValue: ticket.status_id,
    onSave: async (nextValue) => {
      const { error } = await supabase.from("tickets").update({ status_id: nextValue }).eq("id", ticket.id);
      if (error) throw new Error(error.message);
    },
  });

  const titleAutosave = useFieldAutosave<string>({
    initialValue: ticket.title,
    onSave: async (nextValue) => {
      const { error } = await supabase.from("tickets").update({ title: nextValue }).eq("id", ticket.id);
      if (error) throw new Error(error.message);
    },
  });

  const isAnySaving = [
    requesterAutosave.status,
    ownerAutosave.status,
    categoryAutosave.status,
    priorityAutosave.status,
    statusAutosave.status,
    titleAutosave.status,
  ].includes("saving");
  const isAnySaved = [
    requesterAutosave.status,
    ownerAutosave.status,
    categoryAutosave.status,
    priorityAutosave.status,
    statusAutosave.status,
    titleAutosave.status,
  ].includes("saved");
  const autosaveError =
    requesterAutosave.errorMessage ||
    ownerAutosave.errorMessage ||
    categoryAutosave.errorMessage ||
    priorityAutosave.errorMessage ||
    statusAutosave.errorMessage ||
    titleAutosave.errorMessage;

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
          <PrioritySelect value={priorityAutosave.currentValue} onChange={priorityAutosave.setValue} />
        </div>

        <div className="mt-6 space-y-1 text-xs">
          {sidebarStatus ? <p className="text-zinc-500">{sidebarStatus}</p> : null}
          {autosaveError ? <p className="text-red-600">{autosaveError}</p> : null}
        </div>
      </aside>

      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="border-b border-zinc-100 px-6 pb-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <nav className="text-sm text-zinc-500" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-zinc-900 hover:underline">
                    Tickets
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-zinc-900">#{ticket.ticket_number}</li>
              </ol>
            </nav>
            <StatusSelect
              value={statusAutosave.currentValue}
              onChange={statusAutosave.setValue}
              showLabel={false}
              triggerClassName="w-auto min-w-36 rounded-full border-zinc-300 px-4"
            />
          </div>

          <Input
            value={titleAutosave.currentValue}
            onChange={(event) => titleAutosave.setValue(event.target.value)}
            className="mt-4 h-auto rounded-md border border-transparent px-2 py-1 text-2xl font-semibold shadow-none hover:border-zinc-300 focus-visible:border-zinc-400 focus-visible:ring-0"
            aria-label="Ticket title"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
            <div className="mt-8 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              No updates yet.
            </div>

            <div className="sticky bottom-0 mt-auto bg-white pb-4 pt-4">
              <TicketReplyEditor />
            </div>
          </div>
        </div>
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
            .select("id, ticket_number, title, description, requester_id, owner_id, category_id, priority_id, status_id")
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
