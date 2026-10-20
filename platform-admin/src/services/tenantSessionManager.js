import platformApi from '../api/platformApi';

/**
 * TenantSessionManager manages the lifecycle of just-in-time (JIT) tenant impersonation
 * tokens for platform users accessing tenant-scoped APIs (/tenant/*).
 */
class TenantSessionManager {
  constructor() {
    this._pendingPromises = new Map();
  }

  getActiveTenantId() {
    return localStorage.getItem('platform_builder_tenant_id') || '';
  }

  setActiveTenantId(tenantId) {
    if (tenantId) {
      const nextTenantId = String(tenantId);
      if (this.getActiveTenantId() !== nextTenantId) {
        this.clearTenantSession();
      }
      localStorage.setItem('platform_builder_tenant_id', nextTenantId);
    } else {
      localStorage.removeItem('platform_builder_tenant_id');
      this.clearTenantSession();
    }
  }

  getTenantToken() {
    return localStorage.getItem('tenant_access_token') || null;
  }

  clearTenantSession(expectedTenantId = null) {
    if (
      expectedTenantId !== null &&
      this.getActiveTenantId() !== String(expectedTenantId)
    ) {
      return;
    }
    localStorage.removeItem('tenant_access_token');
    localStorage.removeItem('tenant_user');
    localStorage.removeItem('platform_tenant_token_tenant_id');
  }

  /**
   * Ensures an active tenant console session token exists for the given tenantId.
   * If an active session exists, requests a console token.
   * If no active session exists, provisions a controlled support session first,
   * then acquires the console token.
   */
  async ensureTenantSession(targetTenantId, options = {}) {
    const tenantId = targetTenantId || this.getActiveTenantId();
    if (!tenantId) {
      this.clearTenantSession();
      return null;
    }

    const normalizedTenantId = String(tenantId);
    if (this.getActiveTenantId() !== normalizedTenantId) {
      this.setActiveTenantId(normalizedTenantId);
    }

    // Reuse in-flight requests only when they target the same tenant.
    if (this._pendingPromises.has(normalizedTenantId)) {
      return this._pendingPromises.get(normalizedTenantId);
    }

    const pendingPromise = this._acquireSessionToken(normalizedTenantId, options)
      .finally(() => {
        this._pendingPromises.delete(normalizedTenantId);
      });
    this._pendingPromises.set(normalizedTenantId, pendingPromise);

    return pendingPromise;
  }

  async _acquireSessionToken(tenantId, options = {}) {
    try {
      let platformUser = null;
      try {
        platformUser = JSON.parse(localStorage.getItem('platform_user') || 'null');
      } catch (err) {
        console.warn('Failed to read the signed-in platform user:', err);
      }

      // 1. Fetch active support sessions
      let sessions = [];
      try {
        const sessRes = await platformApi.getSupportSessions();
        sessions = Array.isArray(sessRes?.data)
          ? sessRes.data
          : sessRes?.data?.results || [];
      } catch (err) {
        console.warn('Failed to fetch existing support sessions:', err?.message);
      }

      const now = Date.now();
      let activeSession = sessions.find((s) => {
        const sid = String(s.tenant_id ?? s.tenant_company_id ?? s.company_id);
        const ownerId = s.platform_user_id ?? s.actor_id ?? s.staff_id;
        const ownerEmail = String(s.actor_email ?? s.staff_email ?? '').toLowerCase();
        const belongsToCurrentUser = ownerId != null
          ? platformUser?.id != null && String(ownerId) === String(platformUser.id)
          : Boolean(platformUser?.email) && ownerEmail === String(platformUser.email).toLowerCase();
        const isActive =
          !s.ended_at &&
          s.status !== 'ended' &&
          (!s.expires_at || new Date(s.expires_at).getTime() > now);
        return sid === String(tenantId) && isActive && belongsToCurrentUser;
      });

      // 2. If no active session exists, provision one
      if (!activeSession && options.allowCreate !== false) {
        try {
          const createRes = await platformApi.createSupportSession({
            tenant_company_id: Number(tenantId),
            tenant_id: Number(tenantId),
            access_mode: options.accessMode || 'support_write',
            reason: options.reason || 'Platform Admin Document Template Authoring & Management',
            support_ticket_ref: options.ticketRef || 'DOC-BUILDER',
            duration_minutes: options.durationMinutes || 240,
          });
          activeSession = createRes?.data;
        } catch (createErr) {
          console.warn('Auto-provisioning support session failed:', createErr?.response?.data || createErr?.message);
        }
      }

      if (!activeSession?.id) {
        this.clearTenantSession(tenantId);
        return null;
      }

      // 3. Acquire console token for this session
      const tokenRes = await platformApi.createTenantConsoleToken(activeSession.id);
      const token = tokenRes?.data?.access_token || tokenRes?.data?.token;

      if (token) {
        if (this.getActiveTenantId() !== String(tenantId)) return null;
        localStorage.setItem('tenant_access_token', token);
        localStorage.setItem('platform_tenant_token_tenant_id', String(tenantId));
        localStorage.setItem('platform_builder_tenant_id', String(tenantId));
        return token;
      }

      this.clearTenantSession(tenantId);
      return null;
    } catch (err) {
      console.error('Failed to acquire tenant session token:', err?.response?.data || err?.message);
      this.clearTenantSession(tenantId);
      return null;
    }
  }
}

export const tenantSessionManager = new TenantSessionManager();
export default tenantSessionManager;
