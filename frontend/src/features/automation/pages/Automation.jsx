import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Zap,
  Mail,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Clock3,
  AlertCircle,
  RefreshCw,
  Building,
} from 'lucide-react';
import {
  getBranchNotifications,
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

const DEFAULT_NOTIFICATIONS = [
  // SALES PERSON - LEAD INTAKE
  {
    key: 'new_lead_received',
    name: 'New Lead Received',
    description:
      'Notify the assigned sales person and branch team immediately when a new lead is created, so the lead can be reviewed and contacted without delay.',
    audience: 'SALES PERSON',
    category: 'LEAD INTAKE',
    channelLabel: 'Email',
    enabled: true,
  },
  // SALES PERSON - SALES UPDATES
  {
    key: 'customer_payment_made',
    name: 'Customer Payment Made',
    description:
      'Notify the sales person and branch team when a customer payment is successfully received, so the team can continue the booking or service process.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'customer_submit_inventory',
    name: 'Customer Submit Inventory',
    description:
      'Notify the sales person when the customer submits lead inventory details, so the team can review the intake and prepare the next step.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'document_completed',
    name: 'Document Completed',
    description:
      'Notify the sales person when a required document has been completed or signed, so the move process can continue to the next stage.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'estimate_accepted',
    name: 'Estimate Accepted',
    description:
      'Notify the sales person when an estimate has been accepted or signed, so they can proceed with booking and next-step coordination.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'job_cancel_sales_person',
    name: 'Job Cancel (Sales Person)',
    description:
      'Notify the sales person when a booked or scheduled job is canceled, so they can update scheduling, records, and internal follow-up.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'job_confirm_sales_person',
    name: 'Job Confirm (Sales Person)',
    description:
      'Notify the sales person when a job is confirmed, so internal planning, scheduling, and customer handling stay in sync.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'new_email_sms_reply_lead_sales_person',
    name: 'New Email & SMS Reply (Lead - Sales Person)',
    description:
      'Notify the sales person when a customer sends a new inbound email or SMS linked to a lead, so the lead does not go unattended.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'new_email_sms_reply_opportunity_sales_person',
    name: 'New Email & SMS Reply (Opportunity - Sales Person)',
    description:
      'Notify the sales person when a customer sends a new inbound email or SMS linked to an opportunity, so they can respond quickly.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'opportunity_booked_sales_person',
    name: 'Opportunity Booked (Sales Person)',
    description:
      'Notify the sales person when an opportunity is booked, so the opportunity can be advanced into the confirmed service workflow.',
    audience: 'SALES PERSON',
    category: 'SALES UPDATES',
    channelLabel: 'Email & SMS',
    enabled: true,
  },

  // CUSTOMER - LEAD INTAKE
  {
    key: 'new_email_sms_reply_lead_customer',
    name: 'New Email & SMS Reply (Lead - Customer)',
    description:
      'Send an acknowledgement to the customer that their new message linked to a lead has been received by the team.',
    audience: 'CUSTOMER',
    category: 'LEAD INTAKE',
    channelLabel: 'Email',
    enabled: true,
  },
  {
    key: 'new_lead_request_response',
    name: 'New Lead Request Response',
    description:
      'Send an immediate acknowledgement to the customer confirming that their move request was received and will be reviewed by the team.',
    audience: 'CUSTOMER',
    category: 'LEAD INTAKE',
    channelLabel: 'Email',
    enabled: true,
  },

  // CUSTOMER - CUSTOMER SIGN-OFF
  {
    key: 'document_signed',
    name: 'Document Signed',
    description:
      'Send a confirmation to the customer after their document has been signed or completed, so they know the submission was received successfully.',
    audience: 'CUSTOMER',
    category: 'CUSTOMER SIGN-OFF',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
  {
    key: 'estimate_signed',
    name: 'Estimate Signed',
    description:
      'Send a confirmation to the customer after their estimate has been signed, so they know the acceptance was received and next steps will follow.',
    audience: 'CUSTOMER',
    category: 'CUSTOMER SIGN-OFF',
    channelLabel: 'Email',
    enabled: true,
  },
  {
    key: 'new_email_sms_reply_opportunity_customer',
    name: 'New Email & SMS Reply (Opportunity - Customer)',
    description:
      'Send an acknowledgement to the customer that their new message linked to an opportunity has been received by the team.',
    audience: 'CUSTOMER',
    category: 'CUSTOMER SIGN-OFF',
    channelLabel: 'Email & SMS',
    enabled: true,
  },
];

const MAIN_GROUP_ORDER = ['SALES PERSON', 'CUSTOMER'];
const SUBGROUP_ORDER = {
  'SALES PERSON': ['LEAD INTAKE', 'SALES UPDATES'],
  CUSTOMER: ['LEAD INTAKE', 'CUSTOMER SIGN-OFF'],
};

const Automation = () => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Standard Notifications State
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [localToggles, setLocalToggles] = useState({});

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
  const [runsError, setRunsError] = useState('');
  const [runFilters, setRunFilters] = useState({ status: '', target_type: '' });
  const runsRequestIdRef = useRef(0);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [automationStatusFilter, setAutomationStatusFilter] = useState('all');
  const [errorBanner, setErrorBanner] = useState(null);

  const { user } = useAuth();
  const { can } = useCan();

  const canManageAutomations = can('communications.automations.manage');
  const canViewAutomations = can('communications.automations.view') || canManageAutomations;
  const canUpdateBranchNotifications = can('communications.branch_settings.update');

  const getRequestErrorMessage = (err, fallback) => {
    const status = err?.response?.status;
    if (status === 401) return 'Your session has expired. Sign in again to continue.';
    if (status === 403) return 'You do not have permission to view this information.';
    return err?.response?.data?.detail || err?.response?.data?.error || fallback;
  };

  const formatTriggerLabel = (event) => {
    const eventName = String(event || '').split('.').slice(1).join('.') || event || 'changes';
    const triggerName =
      {
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
    if (!canUpdateBranchNotifications) {
      setNotifications([]);
      setErrorBanner('You do not have permission to view or configure branch notifications.');
      setNotificationsLoading(false);
      return;
    }
    try {
      const res = await getBranchNotifications(branchId);
      setNotifications(Array.isArray(res) ? res : res?.results || []);
    } catch (err) {
      console.error('Failed to load branch notifications:', err);
      setNotifications([]);
      setErrorBanner(getRequestErrorMessage(err, 'Failed to load standard notifications for this branch.'));
    } finally {
      setNotificationsLoading(false);
    }
  };

  // 3. Fetch Custom Automations
  const loadCustomAutomations = async (branchId = selectedBranchId) => {
    if (!canViewAutomations) return;
    setAutomationsLoading(true);
    setErrorBanner(null);
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const res = await getCustomAutomations(params);
      setCustomAutomations(Array.isArray(res) ? res : res?.results || []);
    } catch (err) {
      console.error('Failed to load automations:', err);
      setCustomAutomations([]);
      setErrorBanner(getRequestErrorMessage(err, 'Failed to load custom automations.'));
    } finally {
      setAutomationsLoading(false);
    }
  };

  // 4. Fetch Execution Logs
  const loadRuns = async (automationId = selectedAutomationForLogs) => {
    const requestId = ++runsRequestIdRef.current;
    setRunsLoading(true);
    setRunsError('');
    try {
      if (automationId) {
        const res = await getCustomAutomationRuns(automationId);
        const runsList = Array.isArray(res) ? res : res?.results || [];
        const automation = customAutomations.find((item) => String(item.id) === String(automationId));
        const normalizedRuns = runsList.map((run) => {
          const stepIndex = (automation?.steps || []).findIndex(
            (step) => String(step.id) === String(run.step_id)
          );
          const step = stepIndex >= 0 ? automation.steps[stepIndex] : null;
          return {
            ...run,
            workflow_name: automation?.name || `Workflow #${automationId}`,
            step_type: step ? `send_${step.channel}` : 'send_email',
            step_order: stepIndex >= 0 ? stepIndex : 0,
          };
        });
        if (requestId === runsRequestIdRef.current) {
          setRuns(
            normalizedRuns.sort(
              (left, right) => new Date(right.scheduled_for || 0) - new Date(left.scheduled_for || 0)
            )
          );
        }
        return;
      }

      if (customAutomations.length === 0) {
        if (requestId === runsRequestIdRef.current) setRuns([]);
        return;
      }

      const runsByAutomation = await Promise.all(
        customAutomations.map(async (automation) => {
          const res = await getCustomAutomationRuns(automation.id);
          const runsList = Array.isArray(res) ? res : res?.results || [];
          return runsList.map((run) => {
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
      if (requestId === runsRequestIdRef.current) {
        setRuns(
          runsByAutomation
            .flat()
            .sort((left, right) => new Date(right.scheduled_for || 0) - new Date(left.scheduled_for || 0))
        );
      }
    } catch (err) {
      console.error('Failed to load runs:', err);
      if (requestId === runsRequestIdRef.current) {
        setRuns([]);
        setRunsError(getRequestErrorMessage(err, 'Failed to load automation runs. Try refreshing.'));
      }
    } finally {
      if (requestId === runsRequestIdRef.current) setRunsLoading(false);
    }
  };

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

  const toggleNotification = (key) => {
    setLocalToggles((prev) => ({
      ...prev,
      [key]: prev[key] !== undefined ? !prev[key] : false,
    }));
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
    if (!canManageAutomations) return;
    setLoadingAutomationId(wf.id);
    try {
      const detailed = await getCustomAutomation(wf.id);
      setWizardInitial(detailed || wf);
      setWizardOpen(true);
    } catch (err) {
      console.error('Failed to load automation detail:', err);
      setWizardInitial(wf);
      setWizardOpen(true);
    } finally {
      setLoadingAutomationId(null);
    }
  };

  const handleDuplicateAutomation = async (wf) => {
    if (!canManageAutomations) return;
    try {
      const detailed = await getCustomAutomation(wf.id);
      const source = detailed || wf;
      const payload = {
        name: `${source.name} (Copy)`,
        description: source.description || '',
        event: source.event,
        branch_id: selectedBranchId ? Number(selectedBranchId) : null,
        conditions: source.conditions || { all: [], any: [] },
        is_active: false,
        steps: (source.steps || []).map((s) => ({
          step_order: s.step_order,
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

  // Merge default specification notifications with actual backend notification configuration if available
  const allNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) {
      return DEFAULT_NOTIFICATIONS;
    }
    const apiMap = new Map();
    notifications.forEach((n) => {
      if (n.key) apiMap.set(n.key, n);
      if (n.name) apiMap.set(n.name.toLowerCase().trim(), n);
    });

    const merged = DEFAULT_NOTIFICATIONS.map((item) => {
      const apiItem = apiMap.get(item.key) || apiMap.get(item.name.toLowerCase().trim());
      if (apiItem) {
        apiMap.delete(item.key);
        if (apiItem.name) apiMap.delete(apiItem.name.toLowerCase().trim());
        const activeCh = ['email', 'sms', 'in_app'].filter((c) => apiItem.channels?.[c]?.enabled);
        let derivedChannel = item.channelLabel;
        if (activeCh.includes('email') && activeCh.includes('sms')) derivedChannel = 'Email & SMS';
        else if (activeCh.includes('sms')) derivedChannel = 'SMS';
        else if (activeCh.includes('email')) derivedChannel = 'Email';

        return {
          ...item,
          ...apiItem,
          name: item.name,
          description: item.description || apiItem.description,
          channelLabel: derivedChannel,
          enabled: apiItem.enabled !== undefined ? apiItem.enabled : item.enabled,
        };
      }
      return item;
    });

    Array.from(new Set(apiMap.values())).forEach((apiItem) => {
      const isSalesPerson = String(apiItem.audience || apiItem.key || '')
        .toLowerCase()
        .includes('sales_person');
      const group = isSalesPerson ? 'SALES PERSON' : 'CUSTOMER';
      const cat = String(apiItem.category || 'OTHER').replace(/_/g, ' ').toUpperCase();
      const activeCh = ['email', 'sms', 'in_app'].filter((c) => apiItem.channels?.[c]?.enabled);
      let derivedChannel = 'Email';
      if (activeCh.includes('email') && activeCh.includes('sms')) derivedChannel = 'Email & SMS';
      else if (activeCh.includes('sms')) derivedChannel = 'SMS';

      merged.push({
        key: apiItem.key || apiItem.name,
        name: apiItem.name,
        description: apiItem.description || '',
        audience: group,
        category: cat,
        channelLabel: derivedChannel,
        enabled: apiItem.enabled !== false,
      });
    });

    return merged;
  }, [notifications]);

  const notificationGroups = useMemo(() => {
    const q = String(search || '').toLowerCase().trim();
    const filtered = allNotifications.filter((n) => {
      if (!q) return true;
      return (
        String(n.name || '').toLowerCase().includes(q) ||
        String(n.description || '').toLowerCase().includes(q) ||
        String(n.channelLabel || '').toLowerCase().includes(q) ||
        String(n.category || '').toLowerCase().includes(q)
      );
    });

    const groups = new Map();
    filtered.forEach((notification) => {
      const groupName = String(notification.audience || 'CUSTOMER').toUpperCase();
      const categoryName = String(notification.category || 'OTHER').replace(/_/g, ' ').toUpperCase();

      if (!groups.has(groupName)) groups.set(groupName, new Map());
      const categories = groups.get(groupName);
      if (!categories.has(categoryName)) categories.set(categoryName, []);
      categories.get(categoryName).push(notification);
    });

    const result = [];
    const sortedGroupNames = Array.from(groups.keys()).sort((a, b) => {
      const idxA = MAIN_GROUP_ORDER.indexOf(a);
      const idxB = MAIN_GROUP_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    sortedGroupNames.forEach((gName) => {
      const categories = groups.get(gName);
      const subgroupOrder = SUBGROUP_ORDER[gName] || [];
      const sortedCatNames = Array.from(categories.keys()).sort((a, b) => {
        const idxA = subgroupOrder.indexOf(a);
        const idxB = subgroupOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      result.push({
        name: gName,
        categories: sortedCatNames.map((cName) => ({
          name: cName,
          items: categories.get(cName),
        })),
      });
    });

    return result;
  }, [allNotifications, search]);

  const filteredAutomations = useMemo(() => {
    const q = String(search || '').toLowerCase().trim();
    return customAutomations.filter((w) => {
      if (automationStatusFilter === 'active' && !w.is_active) return false;
      if (automationStatusFilter === 'inactive' && w.is_active) return false;
      if (!q) return true;
      return (
        String(w.name || '').toLowerCase().includes(q) ||
        String(w.description || '').toLowerCase().includes(q) ||
        String(w.event || '').toLowerCase().includes(q)
      );
    });
  }, [customAutomations, search, automationStatusFilter]);

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

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
        <div className="flex flex-col gap-4 rounded-[12px] border border-[#E7EDF5] bg-white p-4 sm:p-5 shadow-none sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F7AE0]/10 text-[#1F7AE0] flex items-center justify-center shrink-0">
              <Bot size={22} className="text-[#1F7AE0]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-heading">Automation Hub</h1>
              <p className="text-xs sm:text-sm text-content-sec">
                Manage automated workflows and communication templates
              </p>
            </div>
          </div>

          {/* Global Controls */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {branches.length > 0 && (
              <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-brand-border bg-subtle p-1.5 sm:justify-start">
                <span className="text-[10px] sm:text-xs font-bold text-muted pl-1 sm:pl-2 uppercase tracking-wide flex items-center gap-1">
                  <Building size={14} className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Branch:
                </span>
                <select
                  className="min-w-0 flex-1 bg-transparent py-1 pl-1 pr-5 text-xs font-semibold text-heading border-none focus:ring-0 cursor-pointer sm:flex-initial sm:text-sm sm:pr-6"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                >
                  {(activeTab === 'rules' || activeTab === 'logs') && <option value="">All Branches / Global</option>}
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
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-300 to-rose-200 px-3 py-2 text-xs font-bold text-heading shadow-sm transition-all hover:brightness-95 sm:gap-2 sm:px-4 sm:text-sm"
              >
                <Plus size={16} className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Create Automation
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-[#E7EDF5]">
          <div className="flex items-center gap-2 overflow-x-auto pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearch('');
                  }}
                  className={`relative flex min-h-[42px] shrink-0 cursor-pointer items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all rounded-t-xl ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-300 to-rose-200 text-heading font-bold shadow-xs'
                      : 'text-[#587195] hover:text-heading hover:bg-slate-100/60'
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 ${isActive ? 'text-orange-800' : 'text-[#587195]'}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
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

        {/* Content Container */}
        <div className="rounded-[12px] border border-[#E7EDF5] bg-white p-4 sm:p-5 shadow-none">
          {/* Search Bar for Notifications / Automations */}
          {activeTab !== 'logs' && (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-[448px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search automations"
                  placeholder="Search automations..."
                  className="w-full h-[36px] bg-[#F0F4F8] text-[#587195] placeholder-[#587195]/70 text-[13px] rounded-[12px] px-4 border border-transparent focus:border-[#E7EDF5] outline-none transition-all"
                />
              </div>
              {activeTab === 'rules' && (
                <div className="flex items-center gap-1.5 bg-subtle p-1 rounded-xl border border-brand-border text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAutomationStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      automationStatusFilter === 'all'
                        ? 'bg-white shadow-xs text-heading font-bold'
                        : 'text-muted hover:text-heading'
                    }`}
                  >
                    All ({customAutomations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutomationStatusFilter('active')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      automationStatusFilter === 'active'
                        ? 'bg-white shadow-xs text-orange-600 font-bold'
                        : 'text-muted hover:text-heading'
                    }`}
                  >
                    Active ({customAutomations.filter((a) => a.is_active).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutomationStatusFilter('inactive')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      automationStatusFilter === 'inactive'
                        ? 'bg-white shadow-xs text-slate-700 font-bold'
                        : 'text-muted hover:text-heading'
                    }`}
                  >
                    Inactive ({customAutomations.filter((a) => !a.is_active).length})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="w-full border border-[#E7EDF5] rounded-[12px] overflow-hidden">
              {/* Table Header */}
              <div
                className="grid items-center h-[38px] px-4 bg-[#EEF3F9] text-[11px] font-bold uppercase tracking-[0.8px] text-[#587195] rounded-t-[12px]"
                style={{ gridTemplateColumns: '68% 18% 14%' }}
              >
                <div className="text-left">WORKFLOW</div>
                <div className="text-left">CHANNEL</div>
                <div className="text-right">ACTIONS</div>
              </div>

              {notificationsLoading ? (
                <div className="p-8 text-center text-sm text-[#587195]">
                  <RefreshCw size={24} className="animate-spin mx-auto text-[#1F7AE0] mb-2" />
                  Loading notifications...
                </div>
              ) : notificationGroups.length > 0 ? (
                notificationGroups.map((group) => (
                  <section key={group.name} aria-label={`${group.name} notifications`}>
                    {/* Main Group Header */}
                    <div className="h-[32px] flex items-center px-4 bg-[#EEF3F9] text-[11px] font-bold uppercase text-[#304E74] border-t border-[#EAF0F7] first:border-t-0">
                      {group.name}
                    </div>

                    {group.categories.map((category) => (
                      <section key={category.name} aria-label={`${category.name} notifications`}>
                        {/* Subgroup Header */}
                        <div className="h-[28px] flex items-center px-4 bg-[#F6F8FB] text-[10px] font-bold uppercase tracking-[0.5px] text-[#587195] border-t border-[#EAF0F7]">
                          {category.name}
                        </div>

                        {/* Notification Rows */}
                        {category.items.map((notification) => {
                          const isEnabled =
                            localToggles[notification.key] !== undefined
                              ? localToggles[notification.key]
                              : Boolean(notification.enabled !== false);

                          return (
                            <div
                              key={notification.key}
                              className="grid items-center min-h-[54px] px-4 py-2.5 bg-white border-b border-[#EAF0F7] last:border-b-0 hover:bg-[#F9FBFE] transition-colors"
                              style={{ gridTemplateColumns: '68% 18% 14%' }}
                            >
                              {/* Workflow Column */}
                              <div className="pr-4 min-w-0">
                                <div className="text-[14px] font-bold text-[#111827] leading-[20px]">
                                  {notification.name}
                                </div>
                                {notification.description && (
                                  <div
                                    className="text-[12px] font-normal text-[#49658D] leading-[18px] mt-[2px] sm:truncate"
                                    title={notification.description}
                                  >
                                    {notification.description}
                                  </div>
                                )}
                              </div>

                              {/* Channel Column */}
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-[11px] py-[4px] rounded-full bg-[#E6F0FF] text-[#1674E8] text-[12px] font-bold leading-none border-0">
                                  {notification.channelLabel || 'Email'}
                                </span>
                              </div>

                              {/* Actions Column (Toggle) */}
                              <div className="flex items-center justify-end">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isEnabled}
                                  aria-label={`Toggle ${notification.name}`}
                                  onClick={() => toggleNotification(notification.key)}
                                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] focus-visible:ring-offset-1 ${
                                    isEnabled ? 'bg-[#1877F2]' : 'bg-slate-300 hover:bg-slate-400/80'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                      isEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                                    }`}
                                  />
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
                <div className="p-12 text-center text-sm text-[#587195]">
                  {search ? 'No notifications match your search.' : 'No notifications found.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CUSTOM AUTOMATIONS */}
          {activeTab === 'rules' && (
            <div className="overflow-x-auto rounded-2xl border border-[#E6EDF5]" aria-label="Custom automations list">
              <table className="w-full min-w-[880px] table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[48%]" />
                  <col className="w-[14%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr className="h-[38px] bg-[#EEF3F9] text-[11px] font-bold uppercase tracking-[1px] text-[#587195]">
                    <th scope="col" className="px-3 py-0 align-middle">Trigger</th>
                    <th scope="col" className="px-3 py-0 align-middle">Workflow</th>
                    <th scope="col" className="px-3 py-0 align-middle">Filters</th>
                    <th scope="col" className="px-3 py-0 align-middle">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EDF5] text-sm">
                  {automationsLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sm text-muted">
                        <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-primary" />
                        Loading custom automations...
                      </td>
                    </tr>
                  ) : filteredAutomations.length > 0 ? (
                    filteredAutomations.map((wf) => {
                      const allCount = (wf.conditions?.all || []).length;
                      const anyCount = (wf.conditions?.any || []).length;
                      const totalConditions = allCount + anyCount;

                      return (
                        <tr key={wf.id} className="bg-white transition-colors hover:bg-[#FAFCFE]">
                          <td className="px-3 py-2.5 sm:py-3 align-middle text-sm font-semibold text-[#17212B]">
                            {formatTriggerLabel(wf.event)}
                          </td>
                          <td className="min-w-0 px-3 py-2.5 sm:py-3 align-middle">
                            <div className="break-words text-[14px] font-bold leading-5 text-[#111827]">{wf.name}</div>
                            {wf.description && (
                              <p className="whitespace-normal break-words text-[12px] leading-[18px] text-[#526A8D]">{wf.description}</p>
                            )}
                            {(wf.steps || []).length > 0 ? (
                              <div className="mt-0.5 space-y-0.5 whitespace-normal break-words text-[12px] leading-[17px] text-[#526A8D]">
                                {(wf.steps || []).map((step, index) => (
                                  <div key={`${step.id || step.channel}-${index}`}>
                                    {step.channel === 'sms' ? 'Send SMS' : 'Send email'}
                                    {step.delay_minutes > 0 ? ` · +${step.delay_minutes}m` : ''}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-0.5 text-[12px] leading-[17px] text-[#526A8D]">No action configured</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 sm:py-3 align-middle text-sm text-[#17212B]">
                            {totalConditions === 0
                              ? 'No filters'
                              : `${totalConditions} ${totalConditions === 1 ? 'filter' : 'filters'}`}
                          </td>
                          <td className="px-3 py-2.5 sm:py-3 align-middle">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex shrink-0 rounded-full px-3 py-[5px] text-[13px] font-semibold ${
                                  wf.is_active ? 'bg-[#E6F0FF] text-[#1674E8]' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {wf.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditAutomation(wf)}
                                  disabled={!canManageAutomations || loadingAutomationId !== null}
                                  aria-label={`Edit ${wf.name}`}
                                  title={loadingAutomationId === wf.id ? 'Loading automation' : 'Edit automation'}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#17212B] transition-colors hover:bg-[#EDF4FA] hover:text-[#1877F2] disabled:opacity-40"
                                >
                                  {loadingAutomationId === wf.id
                                    ? <RefreshCw size={16} className="animate-spin" />
                                    : <Pencil size={17} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateAutomation(wf)}
                                  disabled={!canManageAutomations}
                                  aria-label={`Duplicate ${wf.name}`}
                                  title="Duplicate automation"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#17212B] transition-colors hover:bg-[#EDF4FA] hover:text-[#1877F2] disabled:opacity-40"
                                >
                                  <Copy size={17} />
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
                                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7AE0] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    wf.is_active ? 'bg-[#1F7AE0]' : 'bg-slate-300 hover:bg-slate-400/80'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                      wf.is_active ? 'translate-x-3.5' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAutomation(wf)}
                                  disabled={!canManageAutomations}
                                  aria-label={`Delete ${wf.name}`}
                                  title="Delete automation (deactivates it)"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-40"
                                >
                                  <Trash2 size={17} />
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
                        {automationStatusFilter === 'inactive'
                          ? 'No deactivated or inactive automations found.'
                          : 'No custom automations found. Click "Create Automation" above to define your first sequence.'}
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
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <select
                  value={selectedAutomationForLogs}
                  onChange={(e) => setSelectedAutomationForLogs(e.target.value)}
                  aria-label="Filter by workflow"
                  className="w-full sm:w-auto sm:flex-1 sm:min-w-[220px] sm:max-w-md h-9 px-3 py-1.5 bg-white rounded-xl text-xs sm:text-sm font-medium border border-brand-border outline-none focus:border-primary"
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
                  className="w-full sm:w-auto sm:min-w-[130px] h-9 px-3 py-1.5 bg-white rounded-xl text-xs sm:text-sm font-medium border border-brand-border outline-none focus:border-primary"
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
                  className="w-full sm:w-auto sm:min-w-[130px] h-9 px-3 py-1.5 bg-white rounded-xl text-xs sm:text-sm font-medium border border-brand-border outline-none focus:border-primary"
                >
                  <option value="">All targets</option>
                  <option value="lead">Lead</option>
                  <option value="opportunity">Opportunity</option>
                </select>
                <button
                  type="button"
                  onClick={() => loadRuns(selectedAutomationForLogs)}
                  disabled={runsLoading || customAutomations.length === 0}
                  className="w-full sm:w-auto h-9 px-3.5 py-1.5 bg-gradient-to-r from-orange-300 to-rose-200 text-heading rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all hover:brightness-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={runsLoading ? 'animate-spin' : ''} /> {runsError ? 'Retry' : 'Refresh Logs'}
                </button>
              </div>

              <div className="border border-border rounded-2xl overflow-x-auto">
                <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[16%]" />
                    <col className="w-[10%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
                      <th scope="col" className="px-3.5 sm:px-4 py-2.5">Workflow</th>
                      <th scope="col" className="px-3.5 sm:px-4 py-2.5">Step</th>
                      <th scope="col" className="px-3.5 sm:px-4 py-2.5">Target</th>
                      <th scope="col" className="px-3.5 sm:px-4 py-2.5">Status</th>
                      <th scope="col" className="px-3.5 sm:px-4 py-2.5">Scheduled</th>
                      <th scope="col" className="px-3.5 sm:px-4 py-2.5">Executed</th>
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
                    ) : runsError ? (
                      <tr>
                        <td colSpan={6} role="alert" className="p-8 text-center text-sm text-rose-700">
                          <div>{runsError}</div>
                          <button
                            type="button"
                            onClick={() => loadRuns(selectedAutomationForLogs)}
                            disabled={runsLoading}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-50 disabled:opacity-50"
                          >
                            <RefreshCw size={14} className={runsLoading ? 'animate-spin' : ''} /> Retry
                          </button>
                        </td>
                      </tr>
                    ) : filteredRuns.length > 0 ? (
                      filteredRuns.map((run) => (
                        <tr key={run.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3.5 sm:px-4 py-2.5">
                            <div className="font-bold text-heading truncate">
                              {run.workflow_name || customAutomations.find((automation) => String(automation.id) === String(selectedAutomationForLogs))?.name || `Workflow #${selectedAutomationForLogs}`}
                            </div>
                            <div className="text-xs text-muted mt-0.5">Run #{run.id}</div>
                          </td>
                          <td className="px-3.5 sm:px-4 py-2.5">
                            <div className="font-medium text-heading">{run.step_type || run.channel || 'send_email'}</div>
                            <div className="text-xs text-muted">Order {run.step_order ?? run.order ?? 0}</div>
                          </td>
                          <td className="px-3.5 sm:px-4 py-2.5">
                            <div className="font-medium text-heading">{run.target_type}</div>
                            <div className="text-xs text-muted">#{run.target_id}</div>
                          </td>
                          <td className="px-3.5 sm:px-4 py-2.5">
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
                          <td className="px-3.5 sm:px-4 py-2.5 text-slate-700 text-xs whitespace-nowrap">
                            {fmtDateTime(run.scheduled_for)}
                          </td>
                          <td className="px-3.5 sm:px-4 py-2.5 text-slate-700 text-xs whitespace-nowrap">
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

        {/* Modal: Custom Automation Wizard */}
        <AutomationWizardModal
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onSaved={() => loadCustomAutomations(selectedBranchId)}
          initialValue={wizardInitial}
          branches={branches}
          defaultBranchId={selectedBranchId}
        />
      </div>
  );
};

export default Automation;
