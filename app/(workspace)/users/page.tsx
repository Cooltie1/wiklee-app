"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type UserRecord = {
  name: string;
  role: "Agent" | "User";
  email: string;
  lastUpdated: string;
};

const users: UserRecord[] = [
  {
    name: "Jane Doe",
    role: "Agent",
    email: "jane.doe@wiklee.app",
    lastUpdated: "2 hours ago",
  },
  {
    name: "John Smith",
    role: "Agent",
    email: "john.smith@wiklee.app",
    lastUpdated: "Yesterday",
  },
  {
    name: "Maya Patel",
    role: "User",
    email: "maya.patel@acme.com",
    lastUpdated: "3 days ago",
  },
  {
    name: "Freddy Mercury",
    role: "User",
    email: "freddy.mercury@queen.com",
    lastUpdated: "1 week ago",
  },
];

export default function UsersPage() {
  const [showAgents, setShowAgents] = useState(true);
  const [showUsers, setShowUsers] = useState(true);

  function toggleAgents() {
    if (showAgents && !showUsers) {
      return;
    }

    setShowAgents((prev) => !prev);
  }

  function toggleUsers() {
    if (showUsers && !showAgents) {
      return;
    }

    setShowUsers((prev) => !prev);
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => (user.role === "Agent" ? showAgents : showUsers));
  }, [showAgents, showUsers]);

  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div className="space-y-3">
        <div>
          <h2 className="text-4xl font-bold">Users</h2>
          <p className="text-sm text-zinc-500">Manage users and agents in one place.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={toggleAgents}
            variant={showAgents ? "default" : "outline"}
            className="rounded-full"
            aria-pressed={showAgents}
          >
            Agents
          </Button>
          <Button
            type="button"
            onClick={toggleUsers}
            variant={showUsers ? "default" : "outline"}
            className="rounded-full"
            aria-pressed={showUsers}
          >
            Users
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 p-4">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-3">Name</th>
              <th className="py-3">Role</th>
              <th className="py-3">Email</th>
              <th className="py-3">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.email} className="border-b border-zinc-100 last:border-b-0">
                <td className="py-4 font-medium">{user.name}</td>
                <td className="py-4">{user.role}</td>
                <td className="py-4">{user.email}</td>
                <td className="py-4">{user.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
