"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const { error } = await supabase.from("tickets").insert({
      title,
      description,
    });

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/");
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

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Creating..." : "Create Ticket"}
        </Button>
      </form>
    </section>
  );
}
