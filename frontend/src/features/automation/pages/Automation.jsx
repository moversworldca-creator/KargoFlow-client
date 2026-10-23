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
  RefreshCw,
  Search,
  MessageSquare,
  Building,
  Settings2,
} from 'lucide-react';
import {
  getBranchNotifications,
  updateBranchNotification,
  getCustomAutomations,
  getCustomAutomation,
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
  const [togglingNotificationKeys, setTogglingNotificationKeys] = useState(() => new Set());
  const [notificationToConfigure, setNotificationToConfigure] = useState(null);

  // Custom Automations State
  const [customAutomations, setCustomAutomations] = useState([]);
  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [togglingAutomationIds, setTogglingAutomationIds] = useState(() => new Set());
  const [loadingAutomationId, setLoadingAutomationId] = useState(null);
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

  const formatTriggerLabel = (event) => {
    const eventName = String(event || '').split('.').slice(1).join('.') || event || 'changes';
    const triggerName = {
      created: 'create',
      updated: 'update',
      status_changed: 'status change',
      status_change: 'status change',
    }[eventName] || String(eventName).replaceAll('_', ' ');
    return `On ${triggerName}`;
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Mail },
    { id: 'rules', label: 'Automations', icon: Zap },
    { id: 'logs', label: 'Automation Logs', icon: Clock3 },
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

      if (selectedAutomationForLogs && !list.some((automation) => String(automation.id) === String(selectedAutomationForLogs))) {
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
    const automations = automationId
      ? customAutomations.filter((automation) => String(automation.id) === String(automationId))
      : customAutomations;
    if (!automations.length) {
      setRuns([]);
      return;
    }
    setRunsLoading(true);
    try {
      const runsByAutomation = await Promise.all(
        automations.map(async (automation) => {
          const res = await getCustomAutomationRuns(automation.id);
          const automationRuns = Array.isArray(res) ? res : res?.results || [];
          return automationRuns.map((run) => {
            const stepIndex = (automation.steps || []).findIndex(
              (step) => String(step.id) === String(run.step_id)
            );
            const step = stepIndex >= 0 ? automation.steps[stepIndex] : null;
            return {
              ...run,
              workflow_name: automation.name,
              step_type: step ? `send_${step.channel}` : 'send_email',
              step_order: stepIndex >= 0 ? stepIndex : 0,
            };
          });
        })
      );
      setRuns(
        runsByAutomation
          .flat()
          .sort((left, right) => new Date(right.scheduled_for || 0) - new Date(left.scheduled_for || 0))
      );
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
      loadCustomAutomations(selectedBranchId);
    }
  }, [activeTab, selectedBranchId]);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadRuns(selectedAutomationForLogs);
    }
  }, [activeTab, customAutomations, selectedAutomationForLogs]);

  // Master toggle for Standard Notification
  const handleToggleNotification = async (notification) => {
    if (!canUpdateBranchNotifications) return;
    if (togglingNotificationKeys.has(notification.key)) return;

    const nextEnabled = !notification.enabled;
    const supportedChannels = notification.supported_channels || Object.keys(notification.channels || {});
    const availableChannels = supportedChannels.filter((channel) =>
      channel === 'in_app' ? Boolean(notification.channels?.in_app) : Boolean(notification.channels?.[channel]?.template_id)
    );
    if (nextEnabled && availableChannels.length === 0) {
      setErrorBanner(null);
      const firstCustomerChannel = supportedChannels.find(
        (channel) => channel === 'email' || channel === 'sms'
      );
      const channels = { ...(notification.channels || {}) };
      if (firstCustomerChannel) {
        channels[firstCustomerChannel] = {
          ...channels[firstCustomerChannel],
          enabled: true,
        };
      }
      setNotificationToConfigure({ ...notification, enabled: true, channels });
      return;
    }

    const payload = { enabled: nextEnabled };
    if (nextEnabled) {
      const enabledChannels = availableChannels.filter(
        (channel) => notification.channels?.[channel]?.enabled
      );
      const channelToEnable =
        enabledChannels.length === 0 ? availableChannels[0] : null;
      payload.channels = Object.fromEntries(
        supportedChannels.map((channel) => {
          const current = notification.channels?.[channel] || {};
          const channelEnabled = channelToEnable
            ? channel === channelToEnable
            : Boolean(current.enabled);
          return [
            channel,
            channel === 'in_app'
              ? { enabled: channelEnabled }
              : { enabled: channelEnabled, template_id: current.template_id || null },
          ];
        })
      );
    }

    setErrorBanner(null);
    setTogglingNotificationKeys((prev) => new Set(prev).add(notification.key));
    try {
      const updated = await updateBranchNotification(selectedBranchId, notification.key, payload);
      setNotifications((prev) =>
        prev.map((item) => (item.key === notification.key ? { ...item, ...updated } : item))
      );
    } catch (err) {
      console.error('Failed to toggle notification:', err);
      setErrorBanner(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          'Failed to update this notification. Please try again.'
      );
    } finally {
      setTogglingNotificationKeys((prev) => {
        const next = new Set(prev);
        next.delete(notification.key);
        return next;
      });
    }
  };

  // Master toggle for Custom Automation
  const handleToggleAutomation = async (wf) => {
    if (!canManageAutomations) return;
    if (togglingAutomationIds.has(wf.id)) return;

    const nextIsActive = !wf.is_active;
    setTogglingAutomationIds((prev) => new Set(prev).add(wf.id));

    try {
      const updated = await updateCustomAutomation(wf.id, { is_active: nextIsActive });
      setCustomAutomations((prev) =>
        prev.map((item) =>
          item.id === wf.id
            ? { ...item, ...updated, is_active: updated?.is_active ?? nextIsActive }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to toggle automation:', err);
      setErrorBanner(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          `Failed to ${nextIsActive ? 'enable' : 'disable'} "${wf.name}". Please try again.`
      );
    } finally {
      setTogglingAutomationIds((prev) => {
        const next = new Set(prev);
        next.delete(wf.id);
        return next;
      });
    }
  };

  const handleEditAutomation = async (wf) => {
    if (!canManageAutomations || loadingAutomationId !== null) return;

    setLoadingAutomationId(wf.id);
    setErrorBanner(null);
    try {
      const response = await getCustomAutomation(wf.id);
      setWizardInitial(response?.data || response);
      setWizardOpen(true);
    } catch (err) {
      console.error('Failed to load custom automation details:', err);
      setErrorBanner(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          `Failed to load "${wf.name}". Please try again.`
      );
    } finally {
      setLoadingAutomationId(null);
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
        String(n.event || '').toLowerCase().includes(q) ||
        String(n.category || '').toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const notificationGroups = useMemo(() => {
    const groups = new Map();
    filteredNotifications.forEach((notification) => {
      const explicitGroup =
        notification.audience || notification.recipient_group || notification.group;
      const inferredGroup = String(notification.key || '').toLowerCase().includes('sales_person')
        ? 'Sales Person'
        : 'Customer';
      const groupName = explicitGroup
        ? String(explicitGroup)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (character) => character.toUpperCase())
        : inferredGroup;
      if (!groups.has(groupName)) groups.set(groupName, new Map());
      const categories = groups.get(groupName);
      const categoryName = String(notification.category || 'other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
      if (!categories.has(categoryName)) categories.set(categoryName, []);
      categories.get(categoryName).push(notification);
    });
    return Array.from(groups, ([name, categories]) => ({
      name,
      categories: Array.from(categories, ([categoryName, items]) => ({
        name: categoryName,
        items,
      })),
    }));
  }, [filteredNotifications]);

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
    if (s === 'success') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-blue-100 text-blue-600 rounded-xl shrink-0">
            <Bot size={24} className="h-5 w-5 sm:h-[26px] sm:w-[26px]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-heading">Automation Hub</h1>
            <p className="text-xs sm:text-sm text-content-sec">
              Manage automated workflows and communication templates
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {branches.length > 0 && (
            <div className="flex min-w-0 items-center space-x-1.5 sm:space-x-2 bg-subtle rounded-xl p-1.5 border border-brand-border">
              <span className="text-[10px] sm:text-xs font-bold text-muted pl-1 sm:pl-2 uppercase tracking-wide flex items-center gap-1">
                <Building size={14} className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Branch:
              </span>
              <select
                className="max-w-[150px] sm:max-w-none bg-transparent text-xs sm:text-sm font-semibold text-heading border-none focus:ring-0 cursor-pointer pl-1 pr-5 sm:pr-6 py-1"
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
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-300 to-rose-200 text-heading rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:brightness-95 transition-all inline-flex items-center gap-1.5 sm:gap-2"
            >
              <Plus size={16} className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Create Automation
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-brand-border">
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
              className={`flex shrink-0 items-center gap-2 px-3 sm:gap-2.5 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-heading bg-gradient-to-r from-orange-300 to-rose-200 rounded-t-xl'
                  : 'text-content-sec hover:text-content-main'
              }`}
            >
              <Icon size={16} className="h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0" />
              {tab.label}
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
      <div className="bg-white rounded-2xl border border-brand-border p-3 sm:p-5 shadow-xs">
        {/* Search Bar for Notifications / Automations */}
        {activeTab !== 'logs' && (
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search automations..."
                className="w-full pl-10 pr-4 py-2 bg-subtle rounded-xl text-xs sm:text-sm border border-transparent focus:border-brand-border outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* TAB 1: STANDARD NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 sm:px-5 py-3 bg-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
              <div className="col-span-8 sm:col-span-7">Workflow</div>
              <div className="hidden sm:block sm:col-span-3">Channel</div>
              <div className="col-span-4 sm:col-span-2 text-right">Actions</div>
            </div>

            {notificationsLoading ? (
              <div className="p-8 text-center text-sm text-muted">
                <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                Loading notifications...
              </div>
            ) : notificationGroups.length > 0 ? (
              notificationGroups.map((group) => (
                <section key={group.name} aria-label={`${group.name} notifications`}>
                  <div className="px-4 sm:px-5 py-2.5 bg-slate-100 text-[0.6875rem] font-bold uppercase tracking-widest text-slate-600">
                    {group.name}
                  </div>
                  {group.categories.map((category) => (
                    <section key={category.name} aria-label={`${category.name} notifications`}>
                      <div className="px-4 sm:px-5 py-2 bg-slate-50 text-[0.625rem] font-bold uppercase tracking-widest text-slate-500 border-t border-slate-100">
                        {category.name}
                      </div>
                      {category.items.map((notification) => {
                        const activeChannels = ['in_app', 'email', 'sms'].filter(
                          (channel) =>
                            notification.channels?.[channel]?.enabled &&
                            (channel === 'in_app' || notification.channels?.[channel]?.template_id)
                        );
                        const channelLabel = activeChannels.length
                          ? activeChannels.map((channel) => ({
                              in_app: 'In-app',
                              email: 'Email',
                              sms: 'SMS',
                            }[channel])).join(' & ')
                          : 'Not configured';

                        return (
                          <div
                            key={notification.key}
                            className="grid grid-cols-12 gap-3 px-4 sm:px-5 py-3.5 items-center border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="col-span-8 sm:col-span-7 min-w-0">
                              <button
                                type="button"
                                onClick={() => navigate('/automation/templates')}
                                className="text-left text-sm font-bold text-heading hover:text-primary hover:underline"
                                aria-label={`Open templates for ${notification.name}`}
                              >
                                {notification.name}
                              </button>
                              {notification.description && (
                                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                                  {notification.description}
                                </p>
                              )}
                              <p className="sm:hidden text-[0.6875rem] text-primary font-semibold mt-1">
                                {channelLabel}
                              </p>
                            </div>
                            <div className="hidden sm:block sm:col-span-3">
                              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[0.6875rem] font-bold text-blue-600">
                                {channelLabel}
                              </span>
                            </div>
                            <div className="col-span-4 sm:col-span-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setNotificationToConfigure(notification)}
                                disabled={!canUpdateBranchNotifications || !selectedBranchId}
                                aria-label={`Configure ${notification.name}`}
                                title="Configure notification channels and templates"
                                className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                              >
                                <Settings2 className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleNotification(notification)}
                                disabled={
                                  !canUpdateBranchNotifications ||
                                  !selectedBranchId ||
                                  togglingNotificationKeys.has(notification.key)
                                }
                                aria-label={`${notification.enabled ? 'Disable' : 'Enable'} ${notification.name}`}
                                aria-pressed={Boolean(notification.enabled)}
                                aria-busy={togglingNotificationKeys.has(notification.key)}
                                title={
                                  togglingNotificationKeys.has(notification.key)
                                    ? 'Updating notification'
                                    : notification.enabled
                                      ? 'Turn off this workflow; keep its channel and template settings'
                                      : 'Turn on this workflow'
                                }
                                className="inline-flex items-center justify-center rounded-md p-1 transition-all duration-200 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                              >
                                {notification.enabled ? (
                                  <ToggleRight className="w-8 h-8 text-blue-500 drop-shadow-sm" />
                                ) : (
                                  <ToggleLeft className="w-8 h-8 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  ))}
                </section>
              ))
            ) : (
              <div className="p-12 text-center text-sm text-muted">
                No standard notifications found.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOM AUTOMATIONS */}
        {activeTab === 'rules' && (
          <div className="border border-border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[38%]" />
                <col className="w-[15%]" />
                <col className="w-[25%]" />
              </colgroup>
              <thead>
                <tr className="bg-subtle text-[0.625rem] sm:text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
                  <th scope="col" className="px-4 sm:px-5 py-3">Trigger</th>
                  <th scope="col" className="px-4 sm:px-5 py-3">Workflow</th>
                  <th scope="col" className="px-4 sm:px-5 py-3">Filters</th>
                  <th scope="col" className="px-4 sm:px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {automationsLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sm text-muted">
                      <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                      Loading custom automations...
                    </td>
                  </tr>
                ) : filteredAutomations.length > 0 ? (
                  filteredAutomations.map((wf) => {
                    const allCount = (wf.conditions?.all || []).length;
                    const anyCount = (wf.conditions?.any || []).length;
                    const totalConditions = allCount + anyCount;

                    return (
                      <tr key={wf.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 sm:px-5 py-3.5 text-xs sm:text-sm font-medium text-heading">
                          {formatTriggerLabel(wf.event)}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-heading truncate">{wf.name}</div>
                          {wf.description && (
                            <p className="text-[0.6875rem] sm:text-xs text-muted truncate">{wf.description}</p>
                          )}
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[0.6875rem] sm:text-xs text-muted">
                            {(wf.steps || []).map((step, index) => (
                              <span className="inline-flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded-md" key={`${step.id || step.channel}-${index}`}>
                                {step.channel === 'sms' ? 'Send SMS' : 'Send email'}
                                {step.delay_minutes > 0 ? ` · +${step.delay_minutes}m` : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-xs sm:text-sm text-heading">
                          {totalConditions === 0
                            ? 'No filters'
                            : `${totalConditions} ${totalConditions === 1 ? 'filter' : 'filters'}`}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex shrink-0 rounded-full px-2 py-1 sm:px-2.5 text-[0.625rem] sm:text-[0.6875rem] font-bold ${
                                wf.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {wf.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditAutomation(wf)}
                                disabled={!canManageAutomations || loadingAutomationId !== null}
                                aria-label={`Edit ${wf.name}`}
                                title={loadingAutomationId === wf.id ? 'Loading automation' : 'Edit automation'}
                                className="inline-flex h-8 w-8 items-center justify-center text-slate-700 hover:text-primary rounded-lg transition-colors disabled:opacity-40"
                              >
                                {loadingAutomationId === wf.id
                                  ? <RefreshCw size={16} className="animate-spin" />
                                  : <Pencil size={18} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateAutomation(wf)}
                                disabled={!canManageAutomations}
                                aria-label={`Duplicate ${wf.name}`}
                                title="Duplicate automation"
                                className="inline-flex h-8 w-8 items-center justify-center text-slate-700 hover:text-primary rounded-lg transition-colors disabled:opacity-40"
                              >
                                <Copy size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAutomation(wf)}
                                disabled={!canManageAutomations || togglingAutomationIds.has(wf.id)}
                                aria-label={`${wf.is_active ? 'Disable' : 'Enable'} ${wf.name}`}
                                aria-pressed={Boolean(wf.is_active)}
                                aria-checked={Boolean(wf.is_active)}
                                title={wf.is_active ? 'Disable automation' : 'Enable automation'}
                                aria-busy={togglingAutomationIds.has(wf.id)}
                                role="switch"
                                className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                  wf.is_active ? 'border-blue-500 bg-white' : 'border-slate-300 bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full transition-[left,background-color,border-color] ${
                                    wf.is_active
                                      ? 'left-[18px] border-2 border-blue-500 bg-white'
                                      : 'left-[2px] border border-white bg-white'
                                  }`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAutomation(wf)}
                                disabled={!canManageAutomations}
                                aria-label={`Deactivate ${wf.name}`}
                                title="Deactivate automation"
                                className="inline-flex h-8 w-8 items-center justify-center text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-sm text-muted">
                      No custom automations created yet. Click "Create Automation" above to define your first sequence.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: RUNS & LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
              <select
                value={selectedAutomationForLogs}
                onChange={(e) => setSelectedAutomationForLogs(e.target.value)}
                aria-label="Filter by workflow"
                className="w-full sm:w-[400px] px-3 py-2 bg-white rounded-xl text-sm font-medium border border-brand-border outline-none focus:border-primary"
              >
                <option value="">All workflows</option>
                {customAutomations.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
              <select
                value={runFilters.status}
                onChange={(e) => setRunFilters((prev) => ({ ...prev, status: e.target.value }))}
                aria-label="Filter by status"
                className="w-full sm:w-[120px] px-3 py-2 bg-white rounded-xl text-sm font-medium border border-brand-border outline-none focus:border-primary"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Queued (send accepted)</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <select
                value={runFilters.target_type}
                onChange={(e) => setRunFilters((prev) => ({ ...prev, target_type: e.target.value }))}
                aria-label="Filter by target"
                className="w-full sm:w-[125px] px-3 py-2 bg-white rounded-xl text-sm font-medium border border-brand-border outline-none focus:border-primary"
              >
                <option value="">All targets</option>
                <option value="lead">Lead</option>
                <option value="opportunity">Opportunity</option>
              </select>
              <button
                type="button"
                onClick={() => loadRuns(selectedAutomationForLogs)}
                disabled={runsLoading || customAutomations.length === 0}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-300 to-rose-200 text-heading rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={14} className={runsLoading ? 'animate-spin' : ''} /> Refresh Logs
              </button>
            </div>

            <div className="border border-border rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[1100px] table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[16%]" />
                  <col className="w-[8%]" />
                  <col className="w-[16%]" />
                  <col className="w-[17%]" />
                  <col className="w-[17%]" />
                </colgroup>
                <thead>
                  <tr className="bg-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
                    <th scope="col" className="px-4 sm:px-5 py-3">Workflow</th>
                    <th scope="col" className="px-4 sm:px-5 py-3">Step</th>
                    <th scope="col" className="px-4 sm:px-5 py-3">Target</th>
                    <th scope="col" className="px-4 sm:px-5 py-3">Status</th>
                    <th scope="col" className="px-4 sm:px-5 py-3">Scheduled</th>
                    <th scope="col" className="px-4 sm:px-5 py-3">Executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {runsLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-sm text-muted">
                        <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                        Loading runs...
                      </td>
                    </tr>
                  ) : filteredRuns.length > 0 ? (
                    filteredRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="font-bold text-heading truncate">
                            {run.workflow_name || customAutomations.find((automation) => String(automation.id) === String(selectedAutomationForLogs))?.name || `Workflow #${selectedAutomationForLogs}`}
                          </div>
                          <div className="text-xs text-muted mt-0.5">Run #{run.id}</div>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="font-medium text-heading">{run.step_type || run.channel || 'send_email'}</div>
                          <div className="text-xs text-muted">Order {run.step_order ?? run.order ?? 0}</div>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="font-medium text-heading">{run.target_type}</div>
                          <div className="text-xs text-muted">#{run.target_id}</div>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[0.6875rem] ${statusTone(run.status)}`}>
                            {run.status === 'completed' ? 'queued' : run.status}
                          </span>
                          {run.status === 'completed' && (
                            <div className="mt-1 text-xs text-muted">
                              Send accepted{run.message_state ? ` · Message ${run.message_state}` : ''}
                            </div>
                          )}
                          {run.error && (
                            <div className="text-rose-600 mt-1 text-xs leading-tight" title={run.error}>
                              {run.error}
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-slate-700 text-xs whitespace-nowrap">
                          {fmtDateTime(run.scheduled_for)}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-slate-700 text-xs whitespace-nowrap">
                          {fmtDateTime(run.executed_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-sm text-muted">
                        {selectedAutomationForLogs
                          ? 'No step execution runs recorded for this workflow yet.'
                          : 'No automation runs found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal 2: Custom Automation Wizard */}
      <AutomationWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => loadCustomAutomations(selectedBranchId)}
        initialValue={wizardInitial}
        branches={branches}
      />
      <NotificationConfigModal
        open={Boolean(notificationToConfigure)}
        onClose={() => setNotificationToConfigure(null)}
        notification={notificationToConfigure}
        branchId={selectedBranchId}
        branchName={branches.find((branch) => String(branch.id) === String(selectedBranchId))?.name}
        onSaved={(updated) => {
          setNotifications((previous) =>
            previous.map((item) => item.key === updated.key ? { ...item, ...updated } : item)
          );
          setNotificationToConfigure(null);
        }}
      />
    </div>
  );
};

export default Automation;
