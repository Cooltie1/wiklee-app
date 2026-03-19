"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { OwnerSelect } from "@/components/OwnerSelect";
import { RequesterSelect } from "@/components/RequesterSelect";
import { CategorySelect } from "@/components/lookup/CategorySelect";
import { PrioritySelect } from "@/components/lookup/PrioritySelect";
import { CustomFieldsSection } from "@/components/tickets/custom-fields/CustomFieldsSection";
import type { ComboboxUser } from "@/components/UserCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAvatarSignedUrl } from "@/lib/avatarSignedUrl";
import { supabase } from "@/lib/supabaseClient";
import {
  buildValueUpsertRow,
  type CustomFieldFormValue,
  getFormValueFromRow,
  isCustomFieldMissingValue,
  type TicketFieldDefinition,
} from "@/lib/ticketCustomFields";
import { isAgentLikeRole } from "@/lib/roles";

type ProfileRow = {
  id: string;
  org_id: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  role: string | null;
};

function userFromAuth(userId: string, displayName?: string | null, firstName?: string | null, lastName?: string | null): ComboboxUser {
  return {
    id: userId,
    display_name: displayName ?? null,
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
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priorityId, setPriorityId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [requesterLoadError, setRequesterLoadError] = useState("");
  const [ownerLoadError, setOwnerLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<TicketFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldFormValue>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      setRequesterLoadError("");
      setOwnerLoadError("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const currentUser = authData.user;

      if (!isMounted) {
        return;
      }

      if (authError || !currentUser) {
        setRequesterLoadError("Unable to load users");
        setOwnerLoadError("Unable to load users");
        setIsLoadingUsers(false);
        setIsLoadingCustomFields(false);
        return;
      }

      setCurrentUserId(currentUser.id);
      setRequesterId((previous) => previous ?? currentUser.id);

      const fallbackCurrentUser = userFromAuth(
        currentUser.id,
        currentUser.user_metadata?.display_name,
        currentUser.user_metadata?.first_name,
        currentUser.user_metadata?.last_name
      );

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, org_id, display_name, first_name, last_name, avatar_path, role");

      if (!isMounted) {
        return;
      }

      if (profileError) {
        setRequesterUsers([fallbackCurrentUser]);
        setOwnerUsers([]);
        setRequesterLoadError("Unable to load users");
        setOwnerLoadError("Unable to load users");
        setIsLoadingUsers(false);
        setIsLoadingCustomFields(false);
        return;
      }

      const rows = (profiles ?? []) as ProfileRow[];
      const currentUserProfile = rows.find((profile) => profile.id === currentUser.id);

      if (currentUserProfile?.org_id) {
        const { data: definitions, error: definitionsError } = await supabase
          .from("ticket_field_definitions")
          .select("id, org_id, key, label, field_type, is_required, is_active, sort_order, config, created_at")
          .eq("org_id", currentUserProfile.org_id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!definitionsError) {
          const loadedDefinitions = (definitions ?? []) as TicketFieldDefinition[];
          setCustomFieldDefinitions(loadedDefinitions);
          setCustomFieldValues(
            loadedDefinitions.reduce<Record<string, CustomFieldFormValue>>((acc, definition) => {
              acc[definition.id] = getFormValueFromRow(definition, undefined);
              return acc;
            }, {})
          );
        }
      }

      setIsLoadingCustomFields(false);

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
            display_name: profile.display_name,
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
            display_name: user.display_name,
            first_name: user.first_name,
            last_name: user.last_name,
            avatarUrl: user.avatarUrl,
          }))
        : [fallbackCurrentUser];

      const hasCurrentUser = requesterList.some((user) => user.id === currentUser.id);
      const normalizedRequesterList = hasCurrentUser ? requesterList : [fallbackCurrentUser, ...requesterList];

      const owners = usersWithAvatars
        .filter((user) => isAgentLikeRole(user.role))
        .map((user) => ({
          id: user.id,
          display_name: user.display_name,
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
    if (!currentUserId) {
      return true;
    }

    return false;
  }, [currentUserId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!currentUserId) {
      setErrorMessage("Unable to determine current user.");
      return;
    }

    const resolvedRequesterId = requesterId ?? currentUserId;

    const validationErrors = customFieldDefinitions.reduce<Record<string, string>>((acc, definition) => {
      if (isCustomFieldMissingValue(definition, customFieldValues[definition.id] ?? null)) {
        acc[definition.id] = `${definition.label} is required.`;
      }
      return acc;
    }, {});

    if (Object.keys(validationErrors).length > 0) {
      setCustomFieldErrors(validationErrors);
      return;
    }

    setCustomFieldErrors({});

    setIsSaving(true);

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        title,
        description,
        requester_id: resolvedRequesterId,
        owner_id: ownerId,
        category_id: categoryId,
        priority_id: priorityId,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      setIsSaving(false);
      setErrorMessage(error?.message ?? "Unable to create ticket.");
      return;
    }

    if (customFieldDefinitions.length > 0) {
      const customValueRows = customFieldDefinitions.map((definition) =>
        buildValueUpsertRow(data.id, definition, customFieldValues[definition.id] ?? null)
      );

      const { error: customFieldError } = await supabase
        .from("ticket_field_values")
        .upsert(customValueRows, { onConflict: "ticket_id,field_definition_id" });

      if (customFieldError) {
        setIsSaving(false);
        setErrorMessage(customFieldError.message || "Unable to save custom fields.");
        return;
      }
    }

    setIsSaving(false);

    router.push(`/tickets/${data.id}`);
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
        />

        <PrioritySelect value={priorityId} onChange={setPriorityId} />

        <CategorySelect value={categoryId} onChange={setCategoryId} />

        <CustomFieldsSection
          definitions={customFieldDefinitions}
          values={customFieldValues}
          onChange={(fieldDefinitionId, nextValue) => {
            setCustomFieldValues((previous) => ({ ...previous, [fieldDefinitionId]: nextValue }));
            setCustomFieldErrors((previous) => {
              if (!previous[fieldDefinitionId]) {
                return previous;
              }

              const next = { ...previous };
              delete next[fieldDefinitionId];
              return next;
            });
          }}
          validationErrors={customFieldErrors}
          disabled={isSaving || isLoadingCustomFields}
          textFieldClassName="bg-white"
          useNativeBooleanCheckbox
        />

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <Button type="submit" disabled={isSaving || isLoadingUsers || !currentUserId || !priorityId}>
          {isSaving ? "Creating..." : "Create Ticket"}
        </Button>
      </form>
    </section>
  );
}
