"use client";

import { useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Link2,
  Reply,
  List,
  ListOrdered,
  Pilcrow,
  SendHorizonal,
  StickyNote,
  Unlink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type TicketCommentComposerProps = {
  ticketId: string;
};

function FormatButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={isActive ? "secondary" : "ghost"}
      className={cn("h-7 w-7 rounded-md", isActive ? "bg-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100")}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function TicketCommentComposer({ ticketId }: TicketCommentComposerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [, setSelectionVersion] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "min-h-6 w-full text-sm leading-6 text-zinc-900 outline-none [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-zinc-400 [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal",
      },
    },
    parseOptions: {
      preserveWhitespace: "full",
    },
    onUpdate: ({ editor: currentEditor }) => {
      setIsEmpty(currentEditor.getText().trim().length === 0);
      setFeedbackMessage(null);
      setErrorMessage(null);
    },
    onSelectionUpdate: () => {
      setSelectionVersion((version) => version + 1);
    },
    onTransaction: () => {
      setSelectionVersion((version) => version + 1);
    },
  });

  async function handleSubmit() {
    if (!editor || isSaving || isEmpty) return;

    setIsSaving(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(authError);
      setErrorMessage("Unable to determine current user. Please refresh and try again.");
      setIsSaving(false);
      return;
    }

    const body = editor.getJSON();

    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: ticketId,
      author_id: user.id,
      body,
      is_internal: isInternal,
    });

    if (error) {
      console.error(error);
      setErrorMessage("Failed to post comment. Please try again.");
      setIsSaving(false);
      return;
    }

    editor.commands.clearContent(true);
    setIsInternal(false);
    setFeedbackMessage("Success! Comment posted.");
    setIsSaving(false);
  }

  function handleSetOrUnsetLink() {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previousUrl ?? "https://");

    if (!url) return;

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-2 py-1.5 shadow-sm">
      <div className="max-h-64 overflow-y-auto px-0.5 pb-1">
        <EditorContent editor={editor} />
      </div>

      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={isInternal ? "secondary" : "ghost"}
              className={cn(
                "h-7 rounded-md px-2 text-xs",
                isInternal ? "bg-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100",
              )}
              onClick={() => setIsInternal((active) => !active)}
            >
              {isInternal ? <StickyNote className="h-3.5 w-3.5" /> : <Reply className="h-3.5 w-3.5" />}
              {isInternal ? "Internal note" : "Public reply"}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={isFormatOpen ? "secondary" : "ghost"}
              className={cn(
                "h-7 w-7 rounded-md",
                isFormatOpen ? "bg-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100",
              )}
              aria-label="Toggle formatting controls"
              onClick={() => setIsFormatOpen((open) => !open)}
            >
              <Pilcrow className="h-4 w-4" />
            </Button>
            {isFormatOpen ? (
              <div className="flex items-center gap-0 rounded-md">
                <FormatButton
                  isActive={editor?.isActive("bold") ?? false}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-4 w-4" />
                </FormatButton>
                <FormatButton
                  isActive={editor?.isActive("italic") ?? false}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-4 w-4" />
                </FormatButton>
                <FormatButton
                  isActive={editor?.isActive("bulletList") ?? false}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                >
                  <List className="h-4 w-4" />
                </FormatButton>
                <FormatButton
                  isActive={editor?.isActive("orderedList") ?? false}
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="h-4 w-4" />
                </FormatButton>
                <FormatButton isActive={editor?.isActive("link") ?? false} onClick={handleSetOrUnsetLink}>
                  {editor?.isActive("link") ? <Unlink className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                </FormatButton>
              </div>
            ) : null}
          </div>

          <div>
            {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
            {feedbackMessage ? <p className="text-xs text-green-600">{feedbackMessage}</p> : null}
          </div>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="h-7 w-7 rounded-md text-zinc-700 hover:bg-zinc-100"
          onClick={handleSubmit}
          disabled={isSaving || isEmpty || !editor}
          aria-label={isSaving ? "Posting comment" : "Post comment"}
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
