// Roles of one person by branch (users.assign_role): one role per branch, and
// the role acts only in that branch.
import React from 'react';
import BranchRolesEditor from './BranchRolesEditor';
import { describeError } from './errors';
import { useUserAccess } from './queries';
import { Dialog, ErrorBanner, LoadingState } from './ui';

const name = (e) => [e?.first_name, e?.last_name].filter(Boolean).join(' ') || e?.email || 'this person';

export default function RoleAssignModal({ employee, roles, branches, onClose, onDone }) {
  const accessQuery = useUserAccess(employee.user_id, true);
  const access = accessQuery.data;

  return (
    <Dialog title={`Roles for ${name(employee)}`} description="Pick one role for each branch this person works in. A role gives access only in its branch."
      onClose={onClose} size="md">
      {accessQuery.isLoading ? <LoadingState label="Loading roles…" />
        : accessQuery.isError ? <ErrorBanner message={describeError(accessQuery.error).message} onRetry={() => accessQuery.refetch()} />
          : (
            <BranchRolesEditor
              userId={employee.user_id} person={name(employee)} editable
              assignments={access?.roles || []} memberships={(access?.branches || []).filter((b) => b.is_active !== false)}
              roles={roles} branches={branches}
              onSaved={async (message) => { if (message) onDone(message); else await accessQuery.refetch(); }}
            />
          )}
      <p className="mt-3 text-[11px] text-slate-500">Not listed? Add the branch on the person&apos;s Roles &amp; access tab first. To see what a role allows, open it in Roles &amp; Permissions.</p>
    </Dialog>
  );
}
