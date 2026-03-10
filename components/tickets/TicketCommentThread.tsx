"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTicketDetailDateTime } from "@/lib/utils";

type TicketCommentThreadUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

type TicketCommentThreadItem = {
  id: string;
  authorId: string;
  body: object | null;
  createdAt: string;
  isInternal: boolean;
  entryType?: "comment" | "event";
  eventFieldLabel?: string;
  eventOldValue?: string;
  eventNewValue?: string;
  eventChanges?: Array<{
    fieldLabel: string;
    oldValue: string;
    newValue: string;
  }>;
};

type TicketCommentThreadProps = {
  comments: TicketCommentThreadItem[];
  usersById: Record<string, TicketCommentThreadUser>;
  requesterId: string | null;
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "?";

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function TicketCommentBody({ content }: { content: object | null }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
    ],
    content: content ?? "",
    editorProps: {
      attributes: {
        class:
          "text-sm leading-6 text-zinc-900 outline-none [&_a]:text-zinc-700 [&_a]:underline [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:break-words [&_ul]:ml-5 [&_ul]:list-disc",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}

export function TicketCommentThread({ comments, usersById, requesterId }: TicketCommentThreadProps) {
  if (!comments.length) {
    return (
      <div className="mt-8 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
        No updates yet.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 pb-8">
      {comments.map((comment) => {
        const user = usersById[comment.authorId];
        const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown user";
        const fallback = getInitials(fullName);
        const isRequester = requesterId !== null && comment.authorId === requesterId;

        return (
          <article key={comment.id} className={`flex w-full gap-3 ${isRequester ? "justify-start" : "justify-end"}`}>
            <div className={`flex max-w-[80%] gap-3 ${isRequester ? "flex-row" : "flex-row-reverse"}`}>
              <Avatar className="mt-0.5 h-9 w-9 border border-zinc-200">
                {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={`${fullName} avatar`} /> : null}
                <AvatarFallback className="bg-zinc-100 text-xs text-zinc-700">{fallback}</AvatarFallback>
              </Avatar>

              <div className={isRequester ? "text-left" : "text-right"}>
                <div className={`mb-1 flex items-center gap-2 text-sm ${isRequester ? "justify-start" : "justify-end"}`}>
                  {isRequester ? (
                    <>
                      <p className="font-semibold text-zinc-900">{fullName}</p>
                      <p className="text-xs text-zinc-500">{formatTicketDetailDateTime(comment.createdAt)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-zinc-500">{formatTicketDetailDateTime(comment.createdAt)}</p>
                      <p className="font-semibold text-zinc-900">{fullName}</p>
                    </>
                  )}
                </div>

                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    comment.entryType === "event"
                      ? "bg-blue-50 text-blue-900"
                      : comment.isInternal
                        ? "bg-amber-50 text-amber-900"
                      : isRequester
                        ? "bg-slate-50 text-zinc-900"
                        : "bg-slate-50 text-zinc-900"
                  }`}
                >
                  <div className="text-left">
                    {comment.entryType === "event" ? (
                      <div className="space-y-1 text-sm leading-6">
                        {(comment.eventChanges?.length
                          ? comment.eventChanges
                          : [
                              {
                                fieldLabel: comment.eventFieldLabel ?? "Field",
                                oldValue: comment.eventOldValue ?? "None",
                                newValue: comment.eventNewValue ?? "None",
                              },
                            ]
                        ).map((change) => (
                          <p key={`${change.fieldLabel}-${change.oldValue}-${change.newValue}`}>
                            {change.fieldLabel} changed from <span className="font-semibold">{change.oldValue}</span> →{" "}
                            <span className="font-semibold">{change.newValue}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <TicketCommentBody content={comment.body} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export type { TicketCommentThreadItem, TicketCommentThreadUser };
