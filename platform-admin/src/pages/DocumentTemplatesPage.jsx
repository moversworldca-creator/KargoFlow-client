import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { FileSignature, Building2, ChevronDown, Sparkles } from 'lucide-react';
import { useTenants } from '../hooks/usePlatformData';
import platformAxios from '../api/platformAxios';
import tenantSessionManager from '../services/tenantSessionManager';
import DocumentTemplates from '../features/settings/components/DocumentTemplates';

export default function DocumentTemplatesPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tenants = [] } = useTenants();

  const [selectedTenantId, setSelectedTenantId] = useState(() => {
    return tenantSessionManager.getActiveTenantId();
  });
  const [branches, setBranches] = useState([]);

  // Auto-select first tenant if none is currently selected
  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      const firstId = String(tenants[0].id);
      setSelectedTenantId(firstId);
      tenantSessionManager.setActiveTenantId(firstId);
    }
  }, [selectedTenantId, tenants]);

  useEffect(() => {
    let active = true;
    const fetchBranches = async () => {
      if (!selectedTenantId) {
        if (active) setBranches([]);
        return;
      }

      // Ensure a valid tenant session token is ready before calling tenant endpoints
      await tenantSessionManager.ensureTenantSession(selectedTenantId);

      try {
        const res = await platformAxios.get('/tenant/branches/');
        const data = res?.data?.results || res?.data || [];
        if (active) setBranches(Array.isArray(data) ? data : []);
      } catch {
        if (active) setBranches([]);
      }
    };
    fetchBranches();
    return () => {
      active = false;
    };
  }, [selectedTenantId]);

  const handleTenantChange = async (tenantId) => {
    setSelectedTenantId(tenantId);
    tenantSessionManager.setActiveTenantId(tenantId);
    if (tenantId) {
      await tenantSessionManager.ensureTenantSession(tenantId);
    }
    navigate('/document-templates');
  };

  // Robustly extract itemId and subView from params or location
  const pathParts = location.pathname.replace(/^\/(document-templates|estimate-portal-templates|communication-templates)\/?/, '').split('/').filter(Boolean);
  const resolvedItemId = params.itemId || (pathParts.length >= 2 ? pathParts[0] : (pathParts[0] === 'builder' ? null : (pathParts[0] || null)));
  const resolvedSubView = params.subView || (pathParts.includes('builder') ? 'builder' : '');

  const isBuilderActive = resolvedSubView === 'builder' || resolvedItemId === 'builder' || pathParts.includes('builder');

  return (
    <div className={isBuilderActive ? "w-full" : "space-y-4 max-w-7xl mx-auto pb-6"}>
      {/* Hide tenant banner when full-screen builder is active */}
      {!isBuilderActive && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileSignature size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Document Template Builder</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                  <Sparkles size={10} /> Platform Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Author, preview, and configure document templates, invoices, and legal contracts with the Unified Template Builder.
              </p>
            </div>
          </div>

          {/* Tenant Scoping Switcher */}
          {tenants.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
                <Building2 size={14} /> Tenant Scope:
              </span>
              <div className="relative">
                <select
                  value={selectedTenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.company_name || `Tenant ${t.id}`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render DocumentTemplates container */}
      <div className="bg-transparent">
        <DocumentTemplates
          basePath="/document-templates"
          builderRouteView={resolvedSubView}
          builderRouteItemId={resolvedItemId}
          branches={branches}
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onTenantChange={handleTenantChange}
        />
      </div>
    </div>
  );
}
