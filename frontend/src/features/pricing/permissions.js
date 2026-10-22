// Backend permission keys for tariffs, exactly as the RBAC engine names them.
// No role names: what a user may do is the session's permission list. The
// backend checks every action again.
export const TARIFFS = Object.freeze({
  VIEW: 'tariffs.view',
  MANAGE: 'tariffs.manage',
});

export const OPPORTUNITIES = Object.freeze({
  VIEW: 'opportunities.view',
  UPDATE: 'opportunities.update',
});

export const ENTITLEMENTS_VIEW = 'entitlements.view';
