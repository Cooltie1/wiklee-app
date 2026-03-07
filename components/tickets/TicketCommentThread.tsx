"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

function formatTime(timestamp: string) {
  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
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
          "text-sm leading-6 text-zinc-900 outline-none [&_a]:text-blue-600 [&_a]:underline [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:break-words [&_ul]:ml-5 [&_ul]:list-disc",
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
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <p className="font-semibold text-zinc-900">{fullName}</p>
                  <p className="text-xs text-zinc-500">{formatTime(comment.createdAt)}</p>
                </div>

                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    isRequester ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-white [&_a]:text-blue-200"
                  }`}
                >
                  <TicketCommentBody content={comment.body} />
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
