"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import AppShell from "@/components/app-shell";
import { OwnerSelect } from "@/components/OwnerSelect";
import { RequesterSelect } from "@/components/RequesterSelect";
import type { ComboboxUser } from "@/components/UserCombobox";
import { CategorySelect } from "@/components/lookup/CategorySelect";
import { PrioritySelect } from "@/components/lookup/PrioritySelect";
import { StatusSelect } from "@/components/lookup/StatusSelect";
import { Input } from "@/components/ui/input";
import { getAvatarSignedUrl } from "@/lib/avatarSignedUrl";
import { supabase } from "@/lib/supabaseClient";
import { useFieldAutosave } from "@/lib/useFieldAutosave";
import { getUserDisplayName } from "@/lib/userDisplayName";
import { TicketCommentComposer } from "@/components/tickets/TicketCommentComposer";
import {
  TicketCommentThread,
  type TicketCommentThreadItem,
  type TicketCommentThreadUser,
} from "@/components/tickets/TicketCommentThread";

type TicketRow = {
  id: string;
  ticket_number: number;
  title: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  requester_id: string | null;
  owner_id: string | null;
  category_id: string | null;
  priority_id: string | null;
  status_id: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  role: string | null;
};

type TicketEventRow = {
  id: string;
  actor_id: string;
  field_label: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

const EVENT_GROUP_WINDOW_MS = 5 * 60 * 1000;

function groupTicketEvents(events: TicketEventRow[], commentTimestamps: string[]): TicketCommentThreadItem[] {
  const groupedItems: TicketCommentThreadItem[] = [];
  let currentGroup: TicketEventRow[] = [];
  const commentTimes = commentTimestamps.map((timestamp) => new Date(timestamp).getTime());
  let commentCursor = 0;

  const hasCommentBetween = (startTime: number, endTime: number) => {
    while (commentCursor < commentTimes.length && commentTimes[commentCursor] <= startTime) {
      commentCursor += 1;
    }

    return commentCursor < commentTimes.length && commentTimes[commentCursor] < endTime;
  };

  const flushGroup = () => {
    if (!currentGroup.length) return;

    const firstEvent = currentGroup[0];
    const latestEvent = currentGroup[currentGroup.length - 1];
    const changesByField = new Map<string, { fieldLabel: string; oldValue: string; newValue: string }>();

    currentGroup.forEach((event) => {
      const fieldLabel = event.field_label?.trim() || "Field";
      const oldValue = event.old_value?.trim() || "None";
      const newValue = event.new_value?.trim() || "None";
      const existing = changesByField.get(fieldLabel);

      if (!existing) {
        changesByField.set(fieldLabel, {
          fieldLabel,
          oldValue,
          newValue,
        });
        return;
      }

      existing.newValue = newValue;
    });

    const eventChanges = Array.from(changesByField.values()).filter((change) => change.oldValue !== change.newValue);

    if (!eventChanges.length) {
      currentGroup = [];
      return;
    }

    groupedItems.push({
      id: `event-group-${firstEvent.id}`,
      authorId: firstEvent.actor_id,
      body: null,
      createdAt: latestEvent.created_at,
      isInternal: false,
      entryType: "event",
      eventFieldLabel: eventChanges[0]?.fieldLabel,
      eventOldValue: eventChanges[0]?.oldValue,
      eventNewValue: eventChanges[0]?.newValue,
      eventChanges,
    });

    currentGroup = [];
  };

  events.forEach((event) => {
    if (!currentGroup.length) {
      currentGroup.push(event);
      return;
    }

    const firstGroupEvent = currentGroup[0];
    const lastGroupEvent = currentGroup[currentGroup.length - 1];
    const eventTime = new Date(event.created_at).getTime();
    const firstGroupTime = new Date(firstGroupEvent.created_at).getTime();
    const lastGroupTime = new Date(lastGroupEvent.created_at).getTime();
    const isSameActor = event.actor_id === firstGroupEvent.actor_id;
    const commentInterruptedGroup = hasCommentBetween(lastGroupTime, eventTime);

    if (isSameActor && !commentInterruptedGroup && eventTime - firstGroupTime <= EVENT_GROUP_WINDOW_MS) {
      currentGroup.push(event);
      return;
    }

    flushGroup();
    currentGroup.push(event);
  });

  flushGroup();

  return groupedItems;
}

type TicketDetailContentProps = {
  ticket: TicketRow;
  currentUserId: string | null;
  requesterUsers: ComboboxUser[];
  ownerUsers: ComboboxUser[];
  usersById: Record<string, TicketCommentThreadUser>;
};

function TicketDetailContent({ ticket, currentUserId, requesterUsers, ownerUsers, usersById }: TicketDetailContentProps) {
  const [comments, setComments] = useState<TicketCommentThreadItem[]>([]);
  const [events, setEvents] = useState<TicketCommentThreadItem[]>([]);
  const [commentsError, setCommentsError] = useState("");
  const [titleValidationError, setTitleValidationError] = useState("");

  async function loadTimelineEntries() {
    const [commentsResult, eventsResult] = await Promise.all([
      supabase
        .from("ticket_comments")
        .select("id, author_id, body, created_at, is_internal")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("ticket_events")
        .select("id, actor_id, field_key, field_label, old_value, new_value, created_at")
        .eq("ticket_id", ticket.id)
        .eq("event_type", "field_changed")
        .in("field_key", ["status_id", "owner_id", "requester_id", "priority_id", "category_id"])
        .order("created_at", { ascending: true }),
    ]);

    if (commentsResult.error || eventsResult.error) {
      setCommentsError("We couldn't load comments right now.");
      return;
    }

    setCommentsError("");
    setComments(
      (commentsResult.data ?? []).map((comment) => ({
        id: comment.id,
        authorId: comment.author_id,
        body: typeof comment.body === "object" ? comment.body : null,
        createdAt: comment.created_at,
        isInternal: comment.is_internal ?? false,
        entryType: "comment",
      }))
    );

    setEvents(
      groupTicketEvents(
        (eventsResult.data ?? []) as TicketEventRow[],
        (commentsResult.data ?? []).map((comment) => comment.created_at)
      )
    );
  }

  useEffect(() => {
    void loadTimelineEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

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
    revertOnError: false,
    onSave: async (nextValue) => {
      const trimmedTitle = nextValue.trim();

      if (!trimmedTitle) {
        throw new Error("Title is required.");
      }

      const { error } = await supabase.from("tickets").update({ title: trimmedTitle }).eq("id", ticket.id);
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

  const isTitleBlank = titleAutosave.currentValue.trim().length === 0;

  const sidebarStatus = useMemo(() => {
    if (isAnySaving) return "Saving...";
    if (autosaveError) return "Unable to save changes";
    if (isAnySaved) return "Saved";
    return "";
  }, [autosaveError, isAnySaved, isAnySaving]);

  const ticketDescriptionComment = useMemo<TicketCommentThreadItem | null>(() => {
    const description = ticket.description?.trim();

    if (!description || !ticket.created_by) {
      return null;
    }

    const paragraphs = description
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: line,
          },
        ],
      }));

    return {
      id: `${ticket.id}-description`,
      authorId: ticket.created_by,
      body: {
        type: "doc",
        content: paragraphs.length ? paragraphs : [{ type: "paragraph" }],
      },
      createdAt: ticket.created_at,
      isInternal: false,
      entryType: "comment",
    };
  }, [ticket.created_at, ticket.created_by, ticket.description, ticket.id]);

  const threadComments = useMemo(() => {
    const baseEntries = [...comments, ...events];

    if (ticketDescriptionComment) {
      baseEntries.push(ticketDescriptionComment);
    }

    return baseEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments, events, ticketDescriptionComment]);

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
          <StatusSelect value={statusAutosave.currentValue} onChange={statusAutosave.setValue} />
          <CategorySelect value={categoryAutosave.currentValue} onChange={categoryAutosave.setValue} />
          <PrioritySelect value={priorityAutosave.currentValue} onChange={priorityAutosave.setValue} />
        </div>

        <div className="mt-6 space-y-1 text-xs">
          {sidebarStatus ? <p className="text-zinc-500">{sidebarStatus}</p> : null}
          {autosaveError ? <p className="text-red-600">{autosaveError}</p> : null}
        </div>
      </aside>

      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="border-b border-zinc-100 px-6 pb-3 pt-4">
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

          <Input
            value={titleAutosave.currentValue}
            onChange={(event) => {
              const nextTitle = event.target.value;
              titleAutosave.setValue(nextTitle);
              setTitleValidationError(nextTitle.trim() ? "" : "Title is required.");
            }}
            className={`mt-2 h-auto w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border px-2 py-1 md:text-[1.5rem] font-semibold leading-tight shadow-none transition-colors focus-visible:ring-0 ${
              isTitleBlank
                ? "border-red-400 bg-red-50/30 hover:border-red-500 focus-visible:border-red-500"
                : "border-transparent hover:border-zinc-300 focus-visible:border-zinc-400"
            }`}
            aria-label="Ticket title"
            aria-invalid={isTitleBlank}
          />
          {titleValidationError ? <p className="mt-1 text-sm text-red-600">{titleValidationError}</p> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
            {commentsError ? <p className="mt-8 text-sm text-red-600">{commentsError}</p> : null}
            <TicketCommentThread comments={threadComments} usersById={usersById} requesterId={ticket.requester_id} />

            <div className="sticky bottom-0 mt-auto bg-white pb-4 pt-4">
              <TicketCommentComposer ticketId={ticket.id} onCommentPosted={() => void loadTimelineEntries()} />
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
  const [usersById, setUsersById] = useState<Record<string, TicketCommentThreadUser>>({});
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
            .select(
              "id, ticket_number, title, description, created_at, created_by, requester_id, owner_id, category_id, priority_id, status_id"
            )
            .eq("id", ticketId)
            .single(),
          supabase.from("profiles").select("id, display_name, first_name, last_name, avatar_path, role"),
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
            display_name: profile.display_name,
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatarUrl,
            role: profile.role,
          };
        })
      );

      if (!isMounted) return;

      setUsersById(
        usersWithAvatars.reduce<Record<string, TicketCommentThreadUser>>((acc, user) => {
          const fullUser = {
            id: user.id,
            displayName: getUserDisplayName(user),
            avatarUrl: user.avatarUrl,
          };

          acc[user.id] = fullUser;
          return acc;
        }, {})
      );

      setRequesterUsers(
        usersWithAvatars.map((user) => ({
          id: user.id,
          display_name: user.display_name,
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
            display_name: user.display_name,
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
            usersById={usersById}
          />
        )}
      </section>
    </AppShell>
  );
}
