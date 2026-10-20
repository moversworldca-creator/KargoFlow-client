import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Zap,
  Mail,
  Plus,
  Copy,
  Trash2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Clock3,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  RefreshCw,
  Search,
  MessageSquare,
  Building,
  Filter,
} from 'lucide-react';
import {
  getBranchNotifications,
  updateBranchNotification,
  getCustomAutomations,
  updateCustomAutomation,
  deactivateCustomAutomation,
  createCustomAutomation,
  getCustomAutomationRuns,
} from '../../../services/api';
import API from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import useCan from '../../../shared/auth/useCan';
import AutomationWizardModal from '../components/AutomationWizardModal';
import NotificationConfigModal from '../components/NotificationConfigModal';

const Automation = () => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Standard Notifications State
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [configuringNotification, setConfiguringNotification] = useState(null);

  // Custom Automations State
  const [customAutomations, setCustomAutomations] = useState([]);
  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitial, setWizardInitial] = useState(null);

  // Logs State
  const [selectedAutomationForLogs, setSelectedAutomationForLogs] = useState('');
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runFilters, setRunFilters] = useState({ status: '', target_type: '' });

  // Search & Filter
  const [search, setSearch] = useState('');
  const [errorBanner, setErrorBanner] = useState(null);

  const { user } = useAuth();
  const { can } = useCan();
  const navigate = useNavigate();

  const canManageAutomations = can('communications.automations.manage');
  const canUpdateBranchNotifications = can('communications.branch_settings.update');

  const tabs = [
    { id: 'notifications', label: 'Standard Notifications', icon: Mail },
    { id: 'rules', label: 'Custom Automations', icon: Zap },
    { id: 'logs', label: 'Automation Runs & Logs', icon: Clock3 },
  ];

  // 1. Initial Branches Loading
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await API.general.getBranches();
        const list = res?.results || res || [];
        setBranches(list);

        const defaultBranch = list.find((b) => b.id === user?.branch_id) || list[0];
        if (defaultBranch) {
          setSelectedBranchId(String(defaultBranch.id));
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    };
    fetchBranches();
  }, [user]);

  // 2. Fetch Notifications when selectedBranchId changes
  const loadNotifications = async (branchId = selectedBranchId) => {
    if (!branchId) return;
    setNotificationsLoading(true);
    setErrorBanner(null);
    try {
      const res = await getBranchNotifications(branchId);
      setNotifications(Array.isArray(res) ? res : res?.results || []);
    } catch (err) {
      console.error('Failed to load branch notifications:', err);
      setErrorBanner('Failed to load standard notifications for this branch.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  // 3. Fetch Custom Automations
  const loadCustomAutomations = async (branchId = selectedBranchId) => {
    setAutomationsLoading(true);
    setErrorBanner(null);
    try {
      const params = {};
      if (branchId) params.branch_id = branchId;
      const res = await getCustomAutomations(params);
      const list = Array.isArray(res) ? res : res?.results || [];
      setCustomAutomations(list);

      // Pre-select first automation for logs if none selected or no longer present
      if (list.length > 0) {
        if (!selectedAutomationForLogs || !list.some((a) => String(a.id) === String(selectedAutomationForLogs))) {
          setSelectedAutomationForLogs(String(list[0].id));
        }
      } else {
        setSelectedAutomationForLogs('');
      }
    } catch (err) {
      console.error('Failed to load custom automations:', err);
      setErrorBanner('Failed to load custom automations.');
    } finally {
      setAutomationsLoading(false);
    }
  };

  // 4. Fetch Runs for selected Custom Automation
  const loadRuns = async (automationId = selectedAutomationForLogs) => {
    if (!automationId) {
      setRuns([]);
      return;
    }
    setRunsLoading(true);
    try {
      const res = await getCustomAutomationRuns(automationId);
      setRuns(Array.isArray(res) ? res : res?.results || []);
    } catch (err) {
      console.error('Failed to load runs:', err);
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  };

  // Trigger loads based on active tab and branch changes
  useEffect(() => {
    if (activeTab === 'notifications') {
      if (selectedBranchId) loadNotifications(selectedBranchId);
    } else if (activeTab === 'rules') {
      loadCustomAutomations(selectedBranchId);
    } else if (activeTab === 'logs') {
      if (customAutomations.length === 0) {
        loadCustomAutomations(selectedBranchId);
      } else if (selectedAutomationForLogs) {
        loadRuns(selectedAutomationForLogs);
      }
    }
  }, [activeTab, selectedBranchId]);

  useEffect(() => {
    if (activeTab === 'logs' && selectedAutomationForLogs) {
      loadRuns(selectedAutomationForLogs);
    }
  }, [selectedAutomationForLogs]);

  // Master toggle for Standard Notification
  const handleToggleNotification = async (notification) => {
    if (!canUpdateBranchNotifications) return;

    const nextEnabled = !notification.enabled;

    // Validation: if enabling, verify at least one channel has a template
    if (nextEnabled) {
      const hasConfiguredChannel =
        (notification.channels?.email?.enabled && notification.channels?.email?.template_id) ||
        (notification.channels?.sms?.enabled && notification.channels?.sms?.template_id);

      if (!hasConfiguredChannel) {
        // Open modal instead to let user choose template
        setConfiguringNotification(notification);
        return;
      }
    }

    try {
      const payload = {
        enabled: nextEnabled,
        channels: {
          email: {
            enabled: notification.channels?.email?.enabled,
            template_id: notification.channels?.email?.template_id,
          },
          sms: {
            enabled: notification.channels?.sms?.enabled,
            template_id: notification.channels?.sms?.template_id,
          },
        },
      };

      const updated = await updateBranchNotification(selectedBranchId, notification.key, payload);
      setNotifications((prev) =>
        prev.map((item) => (item.key === notification.key ? { ...item, ...updated } : item))
      );
    } catch (err) {
      console.error('Failed to toggle notification:', err);
      loadNotifications(selectedBranchId);
    }
  };

  // Master toggle for Custom Automation
  const handleToggleAutomation = async (wf) => {
    if (!canManageAutomations) return;
    const nextIsActive = !wf.is_active;

    // Optimistic UI update
    setCustomAutomations((prev) =>
      prev.map((item) => (item.id === wf.id ? { ...item, is_active: nextIsActive } : item))
    );

    try {
      await updateCustomAutomation(wf.id, { is_active: nextIsActive });
    } catch (err) {
      console.error('Failed to toggle automation:', err);
      loadCustomAutomations(selectedBranchId);
    }
  };

  // Duplicate Custom Automation
  const handleDuplicateAutomation = async (wf) => {
    if (!canManageAutomations) return;
    try {
      const payload = {
        name: `${wf.name} (Copy)`.slice(0, 160),
        description: wf.description || '',
        event: wf.event,
        branch_id: wf.branch_id,
        is_active: false,
        conditions: wf.conditions || {},
        steps: (wf.steps || []).map((s) => ({
          channel: s.channel,
          template_id: s.template_id,
          delay_minutes: s.delay_minutes || 0,
          is_active: s.is_active !== false,
        })),
      };
      await createCustomAutomation(payload);
      loadCustomAutomations(selectedBranchId);
    } catch (err) {
      console.error('Failed to duplicate automation:', err);
      alert('Failed to duplicate automation. Please check template availability and try again.');
    }
  };

  // Deactivate / Delete Custom Automation
  const handleDeleteAutomation = async (wf) => {
    if (!canManageAutomations) return;
    if (!window.confirm(`Deactivate custom automation "${wf.name}"?`)) return;

    try {
      await deactivateCustomAutomation(wf.id);
      loadCustomAutomations(selectedBranchId);
    } catch (err) {
      console.error('Failed to deactivate automation:', err);
      alert('Failed to deactivate automation.');
    }
  };

  // Filtered lists
  const filteredNotifications = useMemo(() => {
    const q = String(search || '').toLowerCase().trim();
    if (!q) return notifications;
    return notifications.filter(
      (n) =>
        String(n.name || '').toLowerCase().includes(q) ||
        String(n.description || '').toLowerCase().includes(q) ||
        String(n.event || '').toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const filteredAutomations = useMemo(() => {
    const q = String(search || '').toLowerCase().trim();
    if (!q) return customAutomations;
    return customAutomations.filter(
      (w) =>
        String(w.name || '').toLowerCase().includes(q) ||
        String(w.description || '').toLowerCase().includes(q) ||
        String(w.event || '').toLowerCase().includes(q)
    );
  }, [customAutomations, search]);

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (runFilters.status && r.status !== runFilters.status) return false;
      if (runFilters.target_type && r.target_type !== runFilters.target_type) return false;
      return true;
    });
  }, [runs, runFilters]);

  const statusTone = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s === 'failed') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (s === 'running') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'skipped') return 'bg-slate-200 text-slate-700 border-slate-300';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const fmtDateTime = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  };

  const selectedBranchName = branches.find((b) => String(b.id) === String(selectedBranchId))?.name || '';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Bot size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Automations & Notifications</h1>
            <p className="text-sm text-content-sec">
              Configure branch notifications, custom multi-step rules, and monitor runs
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {branches.length > 0 && (
            <div className="flex items-center space-x-2 bg-subtle rounded-xl p-1.5 border border-brand-border">
              <span className="text-xs font-bold text-muted pl-2 uppercase tracking-wide flex items-center gap-1">
                <Building size={14} /> Branch:
              </span>
              <select
                className="bg-transparent text-sm font-semibold text-heading border-none focus:ring-0 cursor-pointer pl-1 pr-6 py-1"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                {activeTab === 'rules' && <option value="">All Branches / Global</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'rules' && canManageAutomations && (
            <button
              type="button"
              onClick={() => {
                setWizardInitial(null);
                setWizardOpen(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Automation
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
              }}
              className={`flex items-center gap-2.5 px-6 py-4 text-sm font-semibold transition-colors relative cursor-pointer ${
                isActive ? 'text-primary' : 'text-content-sec hover:text-content-main'
              }`}
            >
              <Icon size={18} />
              {tab.label}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs">
        {/* Search Bar for Notifications / Automations */}
        {activeTab !== 'logs' && (
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === 'notifications'
                    ? 'Search standard notifications...'
                    : 'Search custom automations...'
                }
                className="w-full pl-10 pr-4 py-2 bg-subtle rounded-xl text-sm border border-transparent focus:border-brand-border outline-none transition-all"
              />
            </div>
            <div className="text-xs text-muted font-medium">
              Showing {activeTab === 'notifications' ? filteredNotifications.length : filteredAutomations.length} items
            </div>
          </div>
        )}

        {/* TAB 1: STANDARD NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-brand-border rounded-xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Building size={15} className="text-primary shrink-0" />
                <span>
                  Showing definitions for branch: <strong>{selectedBranchName || `#${selectedBranchId}`}</strong>. Changes only apply to this branch.
                </span>
              </div>
              <button
                type="button"
                onClick={() => loadNotifications(selectedBranchId)}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
              <div className="grid grid-cols-12 gap-3 px-5 py-3.5 bg-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
                <div className="col-span-5">Notification & Trigger</div>
                <div className="col-span-4">Delivery Channels</div>
                <div className="col-span-3 text-right">Actions & Status</div>
              </div>

              {notificationsLoading ? (
                <div className="p-8 text-center text-sm text-muted">
                  <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                  Loading notifications...
                </div>
              ) : filteredNotifications.length > 0 ? (
                filteredNotifications.map((n) => (
                  <div
                    key={n.key}
                    className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Column 1: Info & Event */}
                    <div className="col-span-5 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-heading">{n.name}</span>
                        {n.trigger_ready ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Trigger Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Emission
                          </span>
                        )}
                      </div>
                      {n.description && (
                        <p className="text-xs text-muted mt-1 leading-relaxed">{n.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Event: {n.event}
                        </span>
                        <span className="text-[11px] font-mono uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Target: {n.target}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Channels */}
                    <div className="col-span-4 space-y-1.5">
                      {/* Email Status */}
                      <div className="flex items-center gap-2 text-xs">
                        <Mail
                          size={14}
                          className={n.channels?.email?.enabled ? 'text-primary' : 'text-slate-300'}
                        />
                        <span className="font-semibold text-slate-700">Email:</span>
                        {n.channels?.email?.enabled ? (
                          <span className="text-emerald-700 font-medium truncate max-w-[200px]" title={n.channels.email.template_name || ''}>
                            {n.channels.email.template_name || `Template #${n.channels.email.template_id}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">Disabled</span>
                        )}
                      </div>

                      {/* SMS Status */}
                      <div className="flex items-center gap-2 text-xs">
                        <MessageSquare
                          size={14}
                          className={n.channels?.sms?.enabled ? 'text-primary' : 'text-slate-300'}
                        />
                        <span className="font-semibold text-slate-700">SMS:</span>
                        {n.channels?.sms?.enabled ? (
                          <span className="text-emerald-700 font-medium truncate max-w-[200px]" title={n.channels.sms.template_name || ''}>
                            {n.channels.sms.template_name || `Template #${n.channels.sms.template_id}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">Disabled</span>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Actions & Master Switch */}
                    <div className="col-span-3 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setConfiguringNotification(n)}
                        disabled={!canUpdateBranchNotifications}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Settings size={14} /> Configure
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleNotification(n)}
                        disabled={!canUpdateBranchNotifications}
                        className="p-1 rounded-lg hover:bg-subtle transition-colors"
                        title={n.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {n.enabled ? (
                          <ToggleRight size={32} className="text-primary" />
                        ) : (
                          <ToggleLeft size={32} className="text-slate-300" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-sm text-muted">
                  No standard notifications found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM AUTOMATIONS */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
              <div className="grid grid-cols-12 gap-3 px-5 py-3.5 bg-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
                <div className="col-span-4">Automation & Event</div>
                <div className="col-span-4">Execution Steps</div>
                <div className="col-span-2">Scope & Filter</div>
                <div className="col-span-2 text-right">Status & Actions</div>
              </div>

              {automationsLoading ? (
                <div className="p-8 text-center text-sm text-muted">
                  <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                  Loading custom automations...
                </div>
              ) : filteredAutomations.length > 0 ? (
                filteredAutomations.map((wf) => {
                  const allCount = (wf.conditions?.all || []).length;
                  const anyCount = (wf.conditions?.any || []).length;
                  const totalConditions = allCount + anyCount;

                  return (
                    <div
                      key={wf.id}
                      className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Name & Event */}
                      <div className="col-span-4 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-heading">{wf.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                            {wf.event}
                          </span>
                        </div>
                        {wf.description && (
                          <p className="text-xs text-muted mt-1 leading-relaxed">{wf.description}</p>
                        )}
                        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
                          <span className="font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            Target: {wf.target}
                          </span>
                        </div>
                      </div>

                      {/* Steps sequence */}
                      <div className="col-span-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(wf.steps || []).map((s, idx) => (
                            <React.Fragment key={idx}>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700 border border-slate-200">
                                {s.channel === 'sms' ? (
                                  <MessageSquare size={12} className="text-primary" />
                                ) : (
                                  <Mail size={12} className="text-primary" />
                                )}
                                <span className="font-bold">{s.channel.toUpperCase()}</span>
                                <span className="text-muted text-[11px]">
                                  {s.delay_minutes === 0 ? '(0m)' : `(+${s.delay_minutes}m)`}
                                </span>
                              </span>
                              {idx < (wf.steps || []).length - 1 && (
                                <span className="text-slate-400 text-xs">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Scope & Conditions */}
                      <div className="col-span-2 text-xs space-y-1">
                        <div>
                          {wf.branch_id ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Branch #{wf.branch_id}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Company-Wide
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1">
                          <Filter size={12} />
                          {totalConditions === 0
                            ? 'No conditions'
                            : `${totalConditions} rule${totalConditions > 1 ? 's' : ''}`}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAutomation(wf)}
                          disabled={!canManageAutomations}
                          className="p-1 rounded-lg hover:bg-subtle transition-colors"
                          title={wf.is_active ? 'Active (Click to pause)' : 'Paused (Click to activate)'}
                        >
                          {wf.is_active ? (
                            <ToggleRight size={30} className="text-primary" />
                          ) : (
                            <ToggleLeft size={30} className="text-slate-300" />
                          )}
                        </button>

                        {canManageAutomations && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setWizardInitial(wf);
                                setWizardOpen(true);
                              }}
                              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Automation"
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateAutomation(wf)}
                              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Duplicate"
                            >
                              <Copy size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAutomation(wf)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Deactivate / Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-sm text-muted">
                  No custom automations created yet. Click "Create Automation" above to define your first sequence.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RUNS & LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="p-4 bg-slate-50 border border-brand-border rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Automation Selector */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Select Automation
                  </label>
                  <select
                    value={selectedAutomationForLogs}
                    onChange={(e) => setSelectedAutomationForLogs(e.target.value)}
                    className="px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary min-w-[200px]"
                  >
                    <option value="">Select an automation...</option>
                    {customAutomations.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (#{w.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Status
                  </label>
                  <select
                    value={runFilters.status}
                    onChange={(e) => setRunFilters((prev) => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>

                {/* Target Type Filter */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Target
                  </label>
                  <select
                    value={runFilters.target_type}
                    onChange={(e) => setRunFilters((prev) => ({ ...prev, target_type: e.target.value }))}
                    className="px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary"
                  >
                    <option value="">All Targets</option>
                    <option value="lead">Lead</option>
                    <option value="opportunity">Opportunity</option>
                  </select>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => loadRuns(selectedAutomationForLogs)}
                  disabled={!selectedAutomationForLogs || runsLoading}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-[#003d2f] transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={runsLoading ? 'animate-spin' : ''} /> Refresh Runs
                </button>
              </div>
            </div>

            {/* Runs Table */}
            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
              <div className="grid grid-cols-12 gap-3 px-5 py-3.5 bg-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
                <div className="col-span-2">Run & Step ID</div>
                <div className="col-span-2">Target Record</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Scheduled For</div>
                <div className="col-span-2">Executed At</div>
                <div className="col-span-2">Message State</div>
              </div>

              {runsLoading ? (
                <div className="p-8 text-center text-sm text-muted">
                  <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                  Loading runs...
                </div>
              ) : !selectedAutomationForLogs ? (
                <div className="p-12 text-center text-sm text-muted">
                  Please select a custom automation above to view its recent execution runs.
                </div>
              ) : filteredRuns.length > 0 ? (
                filteredRuns.map((run) => (
                  <div
                    key={run.id}
                    className="grid grid-cols-12 gap-3 px-5 py-4 items-start hover:bg-slate-50/50 transition-colors text-xs"
                  >
                    {/* Run & Step */}
                    <div className="col-span-2">
                      <div className="font-bold text-heading">Run #{run.id}</div>
                      <div className="text-muted mt-0.5">Step #{run.step_id}</div>
                    </div>

                    {/* Target Record */}
                    <div className="col-span-2">
                      <span className="font-mono uppercase bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                        {run.target_type} #{run.target_id}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide text-[10px] border ${statusTone(
                          run.status
                        )}`}
                      >
                        {run.status}
                      </span>
                      {run.error && (
                        <div className="text-rose-600 mt-1 text-[11px] leading-tight">
                          {run.error}
                        </div>
                      )}
                    </div>

                    {/* Scheduled */}
                    <div className="col-span-2 text-slate-600">
                      {fmtDateTime(run.scheduled_for)}
                    </div>

                    {/* Executed */}
                    <div className="col-span-2 text-slate-600">
                      {fmtDateTime(run.executed_at)}
                    </div>

                    {/* Message State */}
                    <div className="col-span-2">
                      {run.message_id ? (
                        <div>
                          <div className="font-semibold text-heading">Msg #{run.message_id}</div>
                          <div className="text-[11px] text-muted capitalize">
                            State: {run.message_state || 'queued'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-sm text-muted">
                  No step execution runs recorded for this automation yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Standard Notification Configuration */}
      <NotificationConfigModal
        open={Boolean(configuringNotification)}
        onClose={() => setConfiguringNotification(null)}
        notification={configuringNotification}
        branchId={selectedBranchId}
        branchName={selectedBranchName}
        onSaved={() => loadNotifications(selectedBranchId)}
      />

      {/* Modal 2: Custom Automation Wizard */}
      <AutomationWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => loadCustomAutomations(selectedBranchId)}
        initialValue={wizardInitial}
        branches={branches}
      />
    </div>
  );
};

export default Automation;
