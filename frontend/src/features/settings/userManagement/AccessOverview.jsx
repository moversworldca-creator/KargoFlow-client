// Settings → Team & Security → Access: every direct user override in the
// company, and the backend's explanation of any user's access decision.
import React, { useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useUserAdminAccess } from './permissions';
import { describeError } from './errors';
import { isReadOnlyMode, useBranchCatalog, useEntitlements, useOverrides, usePermissionCatalog, useRefreshAfterChange, useUsers } from './queries';
import { ExplainAccessPanel, OverrideFormModal, OverridesTable } from './AccessControls';
import { Button, DeniedState, ErrorBanner, LoadingState, ReadOnlyNotice } from './ui';

export default function AccessOverview() {
  const { user } = useAuth();
  const can = useUserAdminAccess();
  const refresh = useRefreshAfterChange();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const overridesQuery = useOverrides({ include_inactive: includeInactive ? 'true' : undefined }, can.viewOverrides);
  const usersQuery = useUsers(can.viewUsers);
  const catalogQuery = usePermissionCatalog(can.viewPermissions || can.manageOverrides);
  const branchesQuery = useBranchCatalog(can.viewBranches);
  const readOnly = isReadOnlyMode(useEntitlements(can.viewEntitlements).data);

  if (!can.viewOverrides && !can.viewPermissions) {
    return <DeniedState>Viewing access overrides needs rbac_overrides.view; explaining decisions needs rbac_permissions.view.</DeniedState>;
  }

  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyNotice />}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold">Direct user overrides</h2>
            <p className="text-[11px] text-slate-500">Per-user ALLOW / DENY on top of roles. A direct DENY wins over every role grant.</p>
          </div>
          <div className="flex items-center gap-2">
            {can.viewOverrides && (
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
                Show revoked and expired
              </label>
            )}
            {can.manageOverrides && !readOnly && can.viewUsers && (
              <Button onClick={() => setShowForm(true)} disabled={!catalogQuery.data?.length}>Add override</Button>
            )}
          </div>
        </div>
        {!can.viewOverrides ? <DeniedState>Viewing overrides needs the rbac_overrides.view permission.</DeniedState>
          : overridesQuery.isLoading ? <LoadingState />
            : overridesQuery.isError ? <ErrorBanner message={describeError(overridesQuery.error).message} onRetry={() => overridesQuery.refetch()} />
              : (
                <OverridesTable overrides={overridesQuery.data} users={usersQuery.data} branches={branchesQuery.data}
                  canManage={can.manageOverrides && !readOnly} currentUserId={user?.id}
                  onRevoked={async (message) => { setNotice(message); await refresh(); }} />
              )}
      </section>

      {can.viewPermissions && (
        <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold">Explain access</h2>
          <p className="text-[11px] text-slate-500">Ask the server why a user is or is not allowed something.</p>
          {!can.viewUsers ? <DeniedState>Choosing a user needs the users.view permission.</DeniedState>
            : catalogQuery.isLoading ? <LoadingState />
              : <ExplainAccessPanel catalog={catalogQuery.data} users={usersQuery.data} branches={branchesQuery.data} />}
        </section>
      )}

      {showForm && (
        <OverrideFormModal catalog={catalogQuery.data} users={usersQuery.data} branches={branchesQuery.data} currentUserId={user?.id}
          onClose={() => setShowForm(false)}
          onSaved={async (_s, message) => { setShowForm(false); setNotice(message); await refresh(); }} />
      )}
    </div>
  );
}
