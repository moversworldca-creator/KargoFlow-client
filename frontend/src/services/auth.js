import API, { getOpportunities } from './api';
import * as apiMethods from './api';

export const authService = {
  _resolveCompanyId: (company) => {
    if (!company) return '';
    if (typeof company === 'object') return String(company.id ?? '');
    return String(company);
  },
  _persistActiveCompany: (company) => {
    if (!company || typeof company !== 'object') return;
    localStorage.setItem('active_company', JSON.stringify(company));
  },

  login: async (email, password) => {
    // Use API.accounts.login
    const data = await API.auth.login({ email, password });
    if (data.access) {
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem(
        'active_company_id',
        authService._resolveCompanyId(data.active_company_id ?? data.active_company ?? data.company ?? data.user?.company)
      );
      authService._persistActiveCompany(data.active_company || data.active_company_details || data.company || data.user?.company);
      localStorage.setItem('isAuthenticated', 'true');
    }
    return data;
  },
  
  switchCompany: async (company_id) => {
    const data = await API.auth.switchCompany({ company_id });
    if (data.access) {
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify({ ...data.user, company: data.active_company || data.company || data.user?.company }));
      localStorage.setItem(
        'active_company_id',
        authService._resolveCompanyId(data.active_company_id ?? data.active_company ?? data.company ?? company_id)
      );
      authService._persistActiveCompany(data.active_company || data.company || data.user?.company);
    }
    return data;
  },

  logout: () => {
    localStorage.clear();
    window.location.href = '/login';
  },
  
  me: async () => {
    // Use API.accounts.me
    const data = await API.auth.me();
    const activeCompanyId = localStorage.getItem('active_company_id');
    const storedActiveCompany = (() => {
      try {
        const raw = localStorage.getItem('active_company');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    if (activeCompanyId && data) {
      const companyDetails = data.active_company || data.active_company_details || data.company_details || storedActiveCompany || data.company || data.user?.company_details || data.user?.company || null;
      data.active_company = companyDetails;
      data.active_company_id = companyDetails?.id ?? data.active_company_id ?? authService._resolveCompanyId(activeCompanyId);
      data.user = {
        ...data.user,
        company: companyDetails || data.user?.company,
      };
    }
    return data;
  },

  refreshToken: async (refreshToken) => {
    // Use API.accounts.refreshToken
    const data = await API.auth.refreshToken(refreshToken);
    return data;
  }
};
