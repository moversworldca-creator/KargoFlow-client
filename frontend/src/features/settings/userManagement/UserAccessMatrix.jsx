// "What they can do": one person's access as configured: grants from the role
// they hold in each branch (acting only in that branch) plus their personal
// exceptions (direct overrides).
//
// This shows configuration, not a decision. The server also applies the plan,
// employment status, branch membership and record ownership on every request;
// "Explain access" asks it for a definitive answer.
import React, { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getRolePermissions } from '../../../services/api';
import { describeError } from './errors';
import { OverrideFormModal } from './AccessControls';
import PermissionMatrix from './PermissionMatrix';
import { buildUserCells } from './matrixModel';
import { assignmentLabel } from './logic';
import { DeniedState, ErrorBanner, LoadingState } from './ui';

const list = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export default function UserAccessMatrix({ employee, login, access, can, catalog, branches, currentUserId, readOnly, onChanged }) {
  const roles = access?.roles || []; // one entry per (role, branch) assignment
  const roleIds = [...new Set(roles.map((r) => String(r.id)))];
  const overrides = access?.overrides || [];
  const [prefill, setPrefill] = useState(null);
  const isSelf = String(employee.user_id) === String(currentUserId);
  const roleQueries = useQueries({
    queries: roleIds.map((id) => ({
      queryKey: ['user-admin', 'role-permissions', Number(id)],
      queryFn: async () => list(await getRolePermissions(id)),
      enabled: can.viewRoles,
      staleTime: 0,
      retry: false,
    })),
  });
  const loading = roleQueries.some((q) => q.isLoading);
  const failed = roleQueries.find((q) => q.isError);
  // Small (one entry per catalog key): computed on each render.
  const cells = buildUserCells(roles.map((role) => ({ role, grants: roleQueries[roleIds.indexOf(String(role.id))]?.data || [] })), overrides);

  if (!can.viewRoles) return <DeniedState>Seeing what a role grants needs the rbac_roles.view permission.</DeniedState>;
  if (loading) return <LoadingState label="Loading access…" />;
  if (failed) return <ErrorBanner message={describeError(failed.error).message} />;

  const canChange = can.manageOverrides && !readOnly && !isSelf;
  const person = [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Everything {person} can do from {roles.length ? <>their roles (<strong>{roles.map((r) => assignmentLabel(r)).join(', ')}</strong>)</> : 'roles (none assigned)'} plus personal exceptions. Each role works only in its branch.
        {' '}The server still checks their plan, employment status, branches and record ownership on every action. Use <em>Explain access</em> for a definitive answer.
      </p>
      {isSelf && <p className="text-[11px] text-slate-500">You cannot add exceptions to your own access.</p>}
      <PermissionMatrix
        mode="user"
        catalog={catalog}
        cells={cells}
        onCellAction={canChange ? (item, cell) => setPrefill({
          permission_key: item.permission_key,
          // Has access now -> offer to block it; no access -> offer to grant it.
          effect: cell.override ? (cell.override.effect === 'deny' ? 'allow' : 'deny') : (cell.roles?.length ? 'deny' : 'allow'),
        }) : undefined}
      />
      {prefill && (
        <OverrideFormModal
          catalog={catalog} branches={branches} initial={prefill} currentUserId={currentUserId}
          fixedUser={{ id: employee.user_id, ...login, first_name: employee.first_name, last_name: employee.last_name }}
          onClose={() => setPrefill(null)}
          onSaved={async () => { setPrefill(null); await onChanged?.(); }}
        />
      )}
    </div>
  );
}
