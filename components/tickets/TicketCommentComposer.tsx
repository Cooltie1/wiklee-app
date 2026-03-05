"use client";

import { useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  SendHorizonal,
  TextQuote,
  Unlink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
      className={cn("h-8 w-8", isActive ? "bg-zinc-200 text-zinc-900" : "")}
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
          "min-h-[96px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus-visible:border-zinc-400",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setIsEmpty(currentEditor.getText().trim().length === 0);
      setFeedbackMessage(null);
      setErrorMessage(null);
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
      is_internal: false,
    });

    if (error) {
      console.error(error);
      setErrorMessage("Failed to post comment. Please try again.");
      setIsSaving(false);
      return;
    }

    editor.commands.clearContent(true);
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
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <TextQuote className="h-4 w-4" />
              Format
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
            <div className="flex items-center gap-1">
              <FormatButton isActive={editor?.isActive("bold") ?? false} onClick={() => editor?.chain().focus().toggleBold().run()}>
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
          </PopoverContent>
        </Popover>
      </div>

      <EditorContent editor={editor} />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          {feedbackMessage ? <p className="text-sm text-green-600">{feedbackMessage}</p> : null}
        </div>
        <Button type="button" onClick={handleSubmit} disabled={isSaving || isEmpty || !editor}>
          <SendHorizonal className="h-4 w-4" />
          {isSaving ? "Posting..." : "Post comment"}
        </Button>
      </div>
    </div>
  );
}
