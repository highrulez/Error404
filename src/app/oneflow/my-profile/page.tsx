"use client";

import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { DEMO_USERS, profileByEmail } from "@/data";

export default function MyProfilePage() {
  const { session } = useAuth();
  if (!session) return null;
  const profile = profileByEmail(session.email);
  const user = DEMO_USERS.find((u) => u.email.toLowerCase() === session.email.toLowerCase());

  return (
    <OneFlowShell title="My Profile" subtitle="Demo account profile">
      <div className="max-w-md rounded-xl border border-flow-line bg-white p-5 shadow-sm text-sm">
        <dl className="space-y-2">
          <div className="flex gap-2">
            <dt className="w-28 text-slate-500">Name</dt>
            <dd className="font-semibold">{profile?.name || session.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 text-slate-500">Email</dt>
            <dd>{session.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 text-slate-500">Initials</dt>
            <dd>{profile?.initials || user?.initials || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 text-slate-500">Role</dt>
            <dd>{session.role}</dd>
          </div>
          {user?.responsibleTeam && (
            <div className="flex gap-2">
              <dt className="w-28 text-slate-500">Team</dt>
              <dd>{user.responsibleTeam}</dd>
            </div>
          )}
        </dl>
      </div>
    </OneFlowShell>
  );
}
