import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useUnreadNotificationsCount } from '../queries/sharedQueries';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, Mail, Plus, User as UserIcon, Settings, LogOut, 
  FilePlus, ClipboardPlus, UserPlus, CheckSquare,
  MessageSquare, AlertCircle, Menu, Phone, Loader2, Clock, Volume2, CreditCard, FileCheck,
  Sun, Moon, Target, Layers, Truck, Zap, Building2, ChevronDown, ChevronRight, ChevronLeft, Check, X
} from 'lucide-react';
import { getActivities, getLeadActivities, getTasks, universalSearch, getNotifications, markAllNotificationsRead, markNotificationRead, markNotificationUnread, getCompanies } from '../../services/api';
import logo from '../../assets/logo.png';
import { getLegacyRecordDetailPath } from '../../features/crm/utils/recordRoutes';
import { toast } from 'sonner';
import { useAuth } from '../../features/auth/context/AuthContext';
import NotificationInboxPopup from './NotificationInboxPopup';

let lastHeaderBootstrapAt = 0;

const asList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const parseDateValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return new Date('');

  // Preserve full timestamps when available, but keep plain YYYY-MM-DD values
  // in local time so date-only notifications do not shift across time zones.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return new Date(normalized);
};

const NOTIFICATION_CATEGORY_META = {
  all: { label: 'All', icon: Bell },
  email: { label: 'Email', icon: Mail },
  sms: { label: 'SMS', icon: MessageSquare },
  lead: { label: 'Inbound Lead', icon: UserPlus },
  update: { label: 'Updates', icon: ClipboardPlus },
  followup: { label: 'Follow-ups', icon: Clock },
  other: { label: 'Other', icon: AlertCircle },
};

const getNotificationCategory = (notification) => {
  const explicit = String(notification?.category || '').trim().toLowerCase();
  if (explicit) return explicit;

  const entity = String(notification?.entity_type || '').toLowerCase();
  const title = String(notification?.title || '').toLowerCase();
  const message = String(notification?.message || '').toLowerCase();
  const haystack = `${entity} ${title} ${message}`;

  if (entity === 'inbound_email') return 'email';
  if (entity === 'inbound_sms') return 'sms';
  if (
    entity === 'lead' ||
    entity.startsWith('lead_') ||
    entity.includes('lead') ||
    entity === 'opportunity' ||
    entity.startsWith('opportunity_') ||
    entity.includes('opportunity') ||
    entity === 'activity' ||
    entity.startsWith('activity_') ||
    entity.includes('note') ||
    entity.includes('comment')
  ) return 'lead';
  if (entity === 'update' || entity === 'updates') return 'update';
  if (
    entity === 'estimate' ||
    entity === 'payment_request' ||
    entity === 'inventory' ||
    entity === 'job' ||
    entity === 'task' ||
    entity === 'workflow' ||
    entity.startsWith('estimate') ||
    entity.startsWith('payment') ||
    entity.startsWith('inventory') ||
    entity.startsWith('job') ||
    entity.startsWith('task') ||
    entity.startsWith('workflow') ||
    haystack.includes('estimate') ||
    haystack.includes('payment') ||
    haystack.includes('inventory') ||
    haystack.includes('job') ||
    haystack.includes('workflow') ||
    haystack.includes('status changed') ||
    haystack.includes('signed') ||
    haystack.includes('submitted')
  ) return 'update';
  if (entity === 'task' || entity === 'followup' || title.includes('follow up') || title.includes('follow-up') || title.includes('followup') || message.includes('follow up') || message.includes('follow-up') || message.includes('followup')) {
    return 'followup';
  }
  return 'other';
};

const getNotificationCategoryLabel = (notification) => {
  const category = getNotificationCategory(notification);
  return NOTIFICATION_CATEGORY_META[category]?.label || 'Other';
};

const getNotificationCategoryIcon = (notification) => {
  const category = getNotificationCategory(notification);
  return NOTIFICATION_CATEGORY_META[category]?.icon || AlertCircle;
};

const NOTIFICATION_PANEL_DEFS = [
  { id: 'notifications', label: 'All', category: 'all', icon: Bell },
  { id: 'notifications-comms', label: 'Mail & SMS', categories: ['email', 'sms'] },
  { id: 'notifications-updates', label: 'Updates & Lead', categories: ['update', 'lead'] },
  { id: 'notifications-followups', label: 'Follow-ups', categories: ['followup'] },
];

const NotificationGroupIcon = ({ kind }) => {
  if (kind === 'comms') {
    return (
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Mail size={13} className="absolute -left-0.5 -top-0.5" />
        <MessageSquare size={12} className="absolute -right-0.5 -bottom-0.5" />
      </span>
    );
  }
  if (kind === 'updates') {
    return (
      <span className="relative flex h-5 w-5 items-center justify-center">
        <ClipboardPlus size={13} className="absolute -left-0.5 -top-0.5" />
        <UserPlus size={12} className="absolute -right-0.5 -bottom-0.5" />
      </span>
    );
  }
  return <Clock size={18} />;
};

const getNotificationLabel = (notification) => {
  const entity = String(notification?.entity_type || '').toLowerCase();
  if (entity === 'inbound_email') return 'New inbound email';
  if (entity === 'inbound_sms') return 'New inbound SMS';
  if (entity === 'lead') return 'New lead';
  if (entity === 'inventory') return 'Inventory update';
  if (entity === 'estimate') return 'Estimate update';
  if (entity === 'payment_request') return 'Payment update';
  return String(notification?.title || '').trim() || 'Notification';
};

const getSearchSubtitle = (row) => {
  const parts = [
    row?.email,
    row?.phone,
    row?.meta,
    row?.branch_name,
    row?.assigned_to,
  ].map((value) => String(value || '').trim()).filter(Boolean);
  return parts.slice(0, 2).join(' · ');
};

const getSearchSecondary = (row) => {
  const type = String(row?.type || '').toLowerCase();
  if (type === 'lead' || type === 'opportunity') {
    return row?.sales_number ? `#${row.sales_number}` : '—';
  }
  if (type === 'job') {
    return row?.meta || '—';
  }
  return row?.meta || row?.email || row?.phone || '—';
};

const DropdownItem = ({ icon: Icon, label, description, category, categoryIcon: CategoryIcon, onClick, timestamp, unread, actionLabel, onAction, isExpired, branchName, assignedTo, rightIcon: RightIcon, className = '' }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onClick?.(event);
    }}
    className={`w-full flex items-start gap-3 p-3 hover:bg-black/5 transition-colors text-left group cursor-pointer ${unread ? 'bg-primary/5' : ''} ${isExpired ? 'bg-red-50 dark:bg-red-900/10' : ''} ${className}`}
  >
    <div className={`mt-0.5 ${isExpired ? 'text-red-500' : 'text-content-sec group-hover:text-primary'}`}>
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {unread ? <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-500' : 'bg-primary-light'} shrink-0`} /> : null}
          <p className={`text-sm truncate ${isExpired ? 'text-red-600 dark:text-red-400 font-bold' : unread ? 'font-extrabold text-content-main' : 'font-semibold text-content-main'}`}>{label}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {category ? (
            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isExpired ? 'border-red-500/20 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'border-black/10 bg-black/5 text-content-sec'}`}>
              {CategoryIcon ? <CategoryIcon size={10} /> : null}
              {category}
            </span>
          ) : null}
          {branchName ? (
            <span className="shrink-0 rounded-full border border-purple-500/20 bg-purple-50 text-purple-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest" title="Branch">
              {branchName}
            </span>
          ) : null}
          {assignedTo ? (
            <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-50 text-blue-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest" title="Assigned">
              {assignedTo}
            </span>
          ) : null}
          {RightIcon ? <RightIcon size={16} className="text-content-sec group-hover:text-primary transition-transform self-center" /> : null}
        </div>
        {timestamp && <span className={`text-[10px] whitespace-nowrap mt-0.5 ${isExpired ? 'text-red-500 font-bold' : 'text-content-sec'}`}>{timestamp}</span>}
      </div>
      {description && <p className={`text-xs mt-0.5 line-clamp-2 ${isExpired ? 'text-red-600/80 dark:text-red-400/80' : 'text-content-sec'}`}>{description}</p>}
    </div>
    {actionLabel && onAction ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAction();
        }}
        className="shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-black/5 text-content-sec hover:text-primary hover:bg-primary/10 transition-colors"
        title={actionLabel}
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);

const Header = ({ onLogout, user, onMenuToggle }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const { switchCompany } = useAuth();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  useEffect(() => {
    const companyId = localStorage.getItem('active_company_id') || user?.company?.id || user?.company || null;
    setSelectedCompanyId(companyId);
  }, [user?.company]);

  useEffect(() => {
    if (openDropdown !== 'profile') {
      setShowCompanyList(false);
    }
  }, [openDropdown]);

  const fetchCompaniesList = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const res = await getCompanies();
      const rawData = res?.data !== undefined ? res.data : res;
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.results)
        ? rawData.results
        : Array.isArray(res?.results)
        ? res.results
        : [];
      setCompanies(list);
    } catch (err) {
      console.error('Failed to fetch companies list in Header:', err);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);
  const [commRecords, setCommRecords] = useState([]);
  const [loadingComm, setLoadingComm] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState('unread'); // all | unread | read
  const [notificationClassFilter, setNotificationClassFilter] = useState('all');
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const lastUnreadRef = useRef(0);
  const notificationsSyncInitializedRef = useRef(false);
  const toastedFollowUpsRef = useRef(new Set());
  const notificationsSignatureRef = useRef('');
  const notificationsRequestRef = useRef(null);
  const notificationsHydratedRef = useRef(false);
  const audioCtxRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchWrapRef = useRef(null);
  const [searchTab, setSearchTab] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx?.state === 'suspended') return;
      const start = ctx.currentTime + 0.02;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(ctx.destination);
      const notes = [
        // A quick rising triad that feels more like a sales/CRM alert than a system beep.
        { frequency: 659.25, at: 0.00, duration: 0.11, gain: 0.14, type: 'triangle' },
        { frequency: 783.99, at: 0.10, duration: 0.12, gain: 0.18, type: 'sine' },
        { frequency: 987.77, at: 0.21, duration: 0.16, gain: 0.13, type: 'sine' },
        { frequency: 1318.51, at: 0.28, duration: 0.08, gain: 0.09, type: 'triangle' },
      ];

      notes.forEach((note) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(note.frequency, start + note.at);
        gain.gain.setValueAtTime(0.0001, start + note.at);
        gain.gain.exponentialRampToValueAtTime(note.gain, start + note.at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.duration);
        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(start + note.at);
        oscillator.stop(start + note.at + note.duration + 0.02);
      });
    } catch {
      // silent
    }
  };

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (notificationsRequestRef.current) return notificationsRequestRef.current;
    const showLoading = !silent && !notificationsSignatureRef.current;
    if (showLoading) setLoadingNotifications(true);
    const request = (async () => {
    try {
      const res = await getNotifications({ limit: 100, ordering: '-created_at' });
      // axiosInstance returns `response.data` directly.
      const rows = asList(res);
      const nextSignature = rows
        .map((n) => `${n?.id ?? ''}:${n?.read_at ? '1' : '0'}:${n?.created_at ?? ''}:${n?.updated_at ?? ''}`)
        .join('|');
      if (nextSignature !== notificationsSignatureRef.current) {
        notificationsSignatureRef.current = nextSignature;
        setNotifications(rows);
      }
      const unread = rows.filter((n) => !n.read_at).length;
      setUnreadNotifications(unread);
      lastUnreadRef.current = unread;
      notificationsHydratedRef.current = true;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      if (showLoading) setLoadingNotifications(false);
    }
    })();
    notificationsRequestRef.current = request.finally(() => {
      notificationsRequestRef.current = null;
    });
    return notificationsRequestRef.current;
  }, []);

  const { data: unreadCount = 0, isSuccess, isFetching } = useUnreadNotificationsCount();

  useEffect(() => {
    if (isSuccess) {
      const next = Number(unreadCount) || 0;
      const prev = lastUnreadRef.current || 0;
      if (!notificationsSyncInitializedRef.current) {
        if (isFetching) return;
        notificationsSyncInitializedRef.current = true;
        lastUnreadRef.current = next;
        setUnreadNotifications(next);
        return;
      }
      if (next !== prev) {
        lastUnreadRef.current = next;
        setUnreadNotifications(next);
        if (notificationsHydratedRef.current && next > prev) {
          if (audioUnlocked) playNotificationSound();
          
          const newCount = next - prev;
          getNotifications({ limit: newCount, ordering: '-created_at' })
            .then(res => {
              const newNots = asList(res);
              newNots.forEach(n => {
                const title = n.title || getNotificationLabel(n) || 'New Notification';
                const body = n.message || 'You have a new notification';

                let nextUrl = n.url;
                if (!nextUrl && n.entity_id) {
                  if (n.entity_type === 'lead') nextUrl = `/leads/${n.entity_id}`;
                  else if (n.entity_type === 'opportunity') nextUrl = `/sales/${n.entity_id}`;
                  else nextUrl = '/crm/activities';
                }
                if (nextUrl && (n.entity_type === 'estimate' || n.entity_type === 'inventory' || n.entity_type === 'payment_request') && !nextUrl.includes('/estimate')) {
                  nextUrl = nextUrl.replace(/\/$/, '') + '/estimate';
                }

                toast.info(title, { 
                  id: 'latest-notification',
                  description: body, 
                  duration: 5000, 
                  position: 'top-right',
                  closeButton: true,
                  action: nextUrl ? { label: 'View', onClick: () => navigate(nextUrl) } : undefined
                });
                
              });
            })
            .catch(() => {
              const msg = newCount === 1 ? 'You have 1 new notification' : `You have ${newCount} new notifications`;
              toast.info(msg, { id: 'latest-notification', duration: 5000, position: 'top-right', closeButton: true });
            });
          
          if (openDropdown && openDropdown.startsWith('notifications')) {
            fetchNotifications({ silent: true }).catch(() => {});
          }
        }
      }
    }
  }, [isSuccess, unreadCount, isFetching, audioUnlocked, openDropdown, fetchNotifications]);

  const processedNotifications = useMemo(() => {
    return notifications || [];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    let rows = processedNotifications;
    if (notificationFilter === 'unread') rows = rows.filter((n) => !n?.read_at);
    if (notificationFilter === 'read') rows = rows.filter((n) => Boolean(n?.read_at));
    return rows;
  }, [processedNotifications, notificationFilter]);

  const notificationUnreadCounts = useMemo(() => {
    return processedNotifications.reduce((acc, notification) => {
      const category = getNotificationCategory(notification);
      const isUnread = !notification?.read_at;
      if (isUnread) {
        acc.all += 1;
        acc[category] = (acc[category] || 0) + 1;
      }
      return acc;
    }, { all: 0, email: 0, sms: 0, lead: 0, update: 0, followup: 0, other: 0 });
  }, [processedNotifications]);

  const groupedNotifications = useMemo(() => {
    const rows = filteredNotifications || [];
    return rows.reduce((acc, notification) => {
      const category = getNotificationCategory(notification);
      if (!acc[category]) acc[category] = [];
      acc[category].push(notification);
      return acc;
    }, {});
  }, [filteredNotifications]);

  const orderedNotificationCategories = useMemo(() => {
    const preferredOrder = ['email', 'sms', 'lead', 'update', 'followup', 'other'];
    return preferredOrder.filter((key) => (groupedNotifications[key] || []).length > 0);
  }, [groupedNotifications]);

  const activeNotificationPanel = useMemo(
    () => NOTIFICATION_PANEL_DEFS.find((panel) => panel.id === openDropdown) || null,
    [openDropdown]
  );

  useEffect(() => {
    setNotificationClassFilter('all');
  }, [openDropdown]);

  useEffect(() => {
    if (openDropdown?.startsWith('notifications')) {
      setNotificationFilter('unread');
      setNotificationClassFilter('all');
    }
  }, [openDropdown]);

  useEffect(() => {
    if (activeNotificationPanel?.categories?.length > 1) {
      setNotificationFilter('all');
    }
  }, [activeNotificationPanel]);

  const activeNotificationCategories = activeNotificationPanel?.categories || [activeNotificationPanel?.category].filter(Boolean);
  const activeNotificationItems = useMemo(() => {
    let rows = processedNotifications;
    if (activeNotificationCategories.length && !activeNotificationCategories.includes('all')) {
      rows = rows.filter((n) => activeNotificationCategories.includes(getNotificationCategory(n)));
    }
    if (notificationClassFilter !== 'all') {
      rows = rows.filter((n) => getNotificationCategory(n) === notificationClassFilter);
    }
    if (notificationFilter === 'unread') rows = rows.filter((n) => !n?.read_at);
    if (notificationFilter === 'read') rows = rows.filter((n) => Boolean(n?.read_at));
    return rows;
  }, [processedNotifications, activeNotificationCategories, notificationFilter, notificationClassFilter]);

  const activeNotificationGroups = useMemo(() => {
    return activeNotificationItems.reduce((acc, notification) => {
      const category = getNotificationCategory(notification);
      if (!acc[category]) acc[category] = [];
      acc[category].push(notification);
      return acc;
    }, {});
  }, [activeNotificationItems]);

  const getUnreadCountForCategories = useCallback(
    (categories) => {
      if (!categories || !categories.length) return 0;
      if (categories.includes('all')) return notificationUnreadCounts.all || 0;
      return categories.reduce((sum, category) => sum + (notificationUnreadCounts[category] || 0), 0);
    },
    [notificationUnreadCounts]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Replaced by useQuery
  }, []);

  useEffect(() => {
    // Browser audio policies require user interaction before playing sounds.
    const unlock = async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        setAudioUnlocked(true);
      } catch {
        // ignore
      }

      try {
        if ('Notification' in window && Notification.permission !== 'denied' && Notification.permission !== 'granted') {
          Notification.requestPermission();
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    // Poll unread count replaced by useQuery
  }, []);

  useEffect(() => {
    // Visibility listener handled by React Query internally.
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadNotifications(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const notificationIcon = (n) => {
    const entity = String(n?.entity_type || '');
    if (entity === 'lead') return UserPlus;
    if (entity === 'inbound_email') return Mail;
    if (entity === 'inbound_sms') return Phone;
    if (entity === 'inventory') return ClipboardPlus;
    if (entity === 'estimate') return FileCheck;
    if (entity === 'payment_request') return CreditCard;
    return AlertCircle;
  };

  const fetchCommRecords = useCallback(async () => {
    setLoadingComm(true);
    try {
      const [salesRes, leadRes] = await Promise.allSettled([
        getActivities({ ordering: '-created_at', limit: 20 }),
        getLeadActivities({ ordering: '-created_at', limit: 20 }),
      ]);

      const sales = salesRes.status === 'fulfilled' ? asList(salesRes.value.data ?? salesRes.value) : [];
      const leads = leadRes.status === 'fulfilled' ? asList(leadRes.value.data ?? leadRes.value) : [];
      const filtered = [...sales, ...leads]
        .filter((a) => a.activity_type === 'email' || a.activity_type === 'sms')
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 20);
      setCommRecords(filtered);
    } catch (err) {
      console.error('Failed to fetch communication records:', err);
    } finally {
      setLoadingComm(false);
    }
  }, []);

  const fetchFollowUps = useCallback(async () => {
    setLoadingFollowUps(true);
    try {
      const response = await getTasks({ ordering: 'due_date', limit: 50 });
      const tasks = asList(response.data ?? response);
      const pending = tasks.filter((task) => 
        String(task?.activity_details?.status || task?.activity?.status || '').toLowerCase() !== 'completed'
      );
      setFollowUps(pending.slice(0, 20));

      if (!notificationsHydratedRef.current) return;

      const overdueTasks = pending.filter(t => t.due_date && new Date(t.due_date) < new Date());
      let newOverdue = [];
      overdueTasks.forEach(t => {
        if (!toastedFollowUpsRef.current.has(t.id)) {
          newOverdue.push(t);
          toastedFollowUpsRef.current.add(t.id);
        }
      });
      
      if (newOverdue.length > 0) {
        if (newOverdue.length === 1) {
          const task = newOverdue[0];
          const label = task.activity_details?.subject || task.task_type || 'Follow-up';
          toast.warning(`Overdue: ${label}`, { 
            id: 'overdue-notification',
            description: 'This follow-up is past its due date.', 
            duration: 5000, 
            position: 'top-right',
            closeButton: true,
            action: { label: 'View', onClick: () => navigate('/crm/activities') }
          });
        } else {
          toast.warning(`You have ${newOverdue.length} overdue follow-ups!`, { 
            id: 'overdue-notification',
            duration: 5000, 
            position: 'top-right',
            closeButton: true,
            action: { label: 'View', onClick: () => navigate('/crm/activities') }
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    } finally {
      setLoadingFollowUps(false);
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    if (now - lastHeaderBootstrapAt < 2000) return undefined;
    lastHeaderBootstrapAt = now;
    fetchCommRecords();
    fetchNotifications({ silent: true });
  }, [fetchCommRecords, fetchNotifications]);

  useEffect(() => {
    if (openDropdown === 'messages') {
      fetchCommRecords();
    }
    if (openDropdown === 'followups' || openDropdown?.startsWith('notifications')) {
      fetchFollowUps();
    }
    if (openDropdown?.startsWith('notifications')) {
      fetchNotifications({ silent: Boolean(notificationsSignatureRef.current) });
    }
  }, [openDropdown, fetchCommRecords, fetchFollowUps, fetchNotifications]);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const getInitials = () => {
    if (!user) return '??';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0].toUpperCase() || 'U';
  };

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'User';

  const commands = useMemo(
    () => [
      { type: 'Feature', label: 'Dashboard', meta: 'CRM overview', onSelect: () => navigate('/dashboard') },
      { type: 'Feature', label: 'Leads', meta: 'Inbound leads list', onSelect: () => navigate('/leads') },
      { type: 'Feature', label: 'Sales', meta: 'Pipeline opportunities', onSelect: () => navigate('/sales') },
      { type: 'Feature', label: 'Jobs', meta: 'Operations schedule', onSelect: () => navigate('/jobs') },
      { type: 'Feature', label: 'Payments', meta: 'Payment requests & payments', onSelect: () => navigate('/payments') },
      { type: 'Feature', label: 'Fleet', meta: 'Trucks & assignments', onSelect: () => navigate('/fleet') },
      { type: 'Feature', label: 'Marketing', meta: 'Campaigns & sources', onSelect: () => navigate('/marketing') },
      { type: 'Feature', label: 'Settings', meta: 'Workspace settings', onSelect: () => navigate('/settings') },
      { type: 'Feature', label: 'Profile', meta: 'Your account', onSelect: () => navigate('/profile') },

      { type: 'Action', label: 'Add New Lead', meta: 'Create inbound lead', onSelect: () => navigate('/leads/new') },

      // Services / configuration inside Settings
      { type: 'Service', label: 'Mover Types', meta: 'Settings → Mover Types', onSelect: () => navigate('/settings') },
      { type: 'Service', label: 'Mover Sizes', meta: 'Settings → Mover Sizes', onSelect: () => navigate('/settings/mover-sizes') },
      { type: 'Service', label: 'Estimate Catalog', meta: 'Settings → Catalog Items', onSelect: () => navigate('/settings/estimate-catalog') },
      { type: 'Service', label: 'Packages', meta: 'Settings → Packages', onSelect: () => navigate('/settings/catalog-packages') },
      { type: 'Service', label: 'Lead Sources', meta: 'Settings → Lead Sources', onSelect: () => navigate('/settings/leads') },
      { type: 'Service', label: 'Integrations', meta: 'Settings → Integrations', onSelect: () => navigate('/settings/integrations') },
      { type: 'Service', label: 'Roles & Permissions', meta: 'Settings → Roles', onSelect: () => navigate('/settings/roles') },
      { type: 'Service', label: 'Status Codes', meta: 'Settings → Status Codes', onSelect: () => navigate('/settings/status-codes') },
      { type: 'Service', label: 'Communication Templates', meta: 'Settings → Templates', onSelect: () => navigate('/settings/templates') },
      { type: 'Service', label: 'Branding', meta: 'Settings → Branding', onSelect: () => navigate('/settings/branding') },
      { type: 'Service', label: 'Customer Portal', meta: 'Settings → Portal', onSelect: () => navigate('/settings/customer-portals') },
      { type: 'Service', label: 'Audit Logs', meta: 'Settings → Audit', onSelect: () => navigate('/settings/audit') },
    ],
    [navigate]
  );

  const commandResults = useMemo(() => {
    const q = String(searchValue || '').trim().toLowerCase();
    if (!q) return [];
    return commands
      .filter((c) => `${c.label} ${c.meta}`.toLowerCase().includes(q))
      .slice(0, 10);
  }, [searchValue, commands]);

  useEffect(() => {
    const q = String(searchValue || '').trim();
    if (q.length < 1) {
      setLiveSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await universalSearch({ q, limit: 8 });
        if (!active) return;
        const rows = asList(response.data ?? response)
          .map((row) => ({
            ...row,
            kind: 'live',
          }))
          .filter((row) => row?.label || row?.meta || row?.url);
        setLiveSearchResults(rows);
      } catch (err) {
        if (active) setLiveSearchResults([]);
        console.error('Failed to fetch header search results:', err);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchValue]);

  const searchResults = useMemo(
    () => [...liveSearchResults, ...commandResults],
    [liveSearchResults, commandResults]
  );

  const searchTabOptions = useMemo(() => {
    const rows = [...liveSearchResults, ...commandResults];
    const counts = { all: rows.length, lead: 0, opportunity: 0, job: 0, customer: 0, other: 0 };
    rows.forEach(r => {
      const t = String(r.type || 'other').toLowerCase();
      if (counts[t] !== undefined) counts[t]++;
      else counts.other++;
    });
    return [
      { id: 'all', label: 'All', count: counts.all },
      { id: 'customer', label: 'Customers', count: counts.customer },
      { id: 'lead', label: 'Leads', count: counts.lead },
      { id: 'opportunity', label: 'Opportunities', count: counts.opportunity },
      { id: 'job', label: 'Jobs', count: counts.job },
      { id: 'other', label: 'Other', count: counts.other },
    ].filter(t => t.id === 'all' || t.count > 0);
  }, [liveSearchResults, commandResults]);

  const filteredSearchResults = useMemo(() => {
    const rows = [...liveSearchResults, ...commandResults];
    if (searchTab === 'all') return rows;
    if (searchTab === 'other') return rows.filter(r => !['lead', 'opportunity', 'job', 'customer'].includes(String(r.type || '').toLowerCase()));
    return rows.filter(row => String(row.type).toLowerCase() === searchTab);
  }, [liveSearchResults, commandResults, searchTab]);

  const handleSearchSelect = (row) => {
    if (!row) return;
    if (row.url) {
      navigate(row.url);
    } else if (typeof row.onSelect === 'function') {
      row.onSelect();
    }
    setSearchOpen(false);
  };

  const handleSearchOpenNewTab = (row) => {
    if (!row) return;
    if (row.url) {
      window.open(row.url, '_blank', 'noopener,noreferrer');
    } else if (typeof row.onSelect === 'function') {
      row.onSelect();
    }
    setSearchOpen(false);
  };

  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = parseDateValue(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    const diffMs = nowTick - date.getTime();
    if (diffMs < 0) return 'just now';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCommLabel = (record) => {
    const isEmail = record.activity_type === 'email';
    const isSms = record.activity_type === 'sms';
    if (isEmail) {
      return record.email_log_details?.to_email || record.to_email || record.subject || 'Email';
    }
    if (isSms) {
      return record.sms_log_details?.to_phone || record.to_phone || 'SMS';
    }
    return record.subject || record.content || record.description || 'Activity';
  };

  const getCommDescription = (record) => {
    const isEmail = record.activity_type === 'email';
    const isSms = record.activity_type === 'sms';
    if (isEmail) {
      return stripHtml(
        record.email_log_details?.body_html ||
        record.email_log_details?.subject ||
        record.content ||
        record.description ||
        ''
      );
    }
    if (isSms) {
      return record.sms_log_details?.message || record.content || record.description || '';
    }
    return record.content || record.description || '';
  };

  return (
    <>
      <header className="px-3 sm:px-5 md:px-8 h-16 md:h-20 flex items-center justify-between flex-shrink-0 z-40 relative bg-white text-slate-800 border-b border-slate-200 shadow-xs gap-2 sm:gap-4">
      {/* Brand & Mobile Menu Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
        <button 
          onClick={onMenuToggle}
          className="p-1.5 sm:p-2 -ml-1 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 lg:hidden transition-colors cursor-pointer"
          title="Open Menu"
          aria-label="Open Menu"
        >
          <Menu size={22} className="sm:w-6 sm:h-6" />
        </button>
        <img
          src={logo}
          alt="KargoFlow"
          className="crm-header-logo block h-7 sm:h-8 md:h-10 w-auto max-w-[110px] xs:max-w-[130px] sm:max-w-[160px] md:max-w-[188px] shrink-0 object-contain"
        />
      </div>
      
      {/* Right Controls & Actions */}
      <div className="relative flex items-center gap-1 sm:gap-1.5 md:gap-2.5 text-slate-600 shrink-0" ref={dropdownRef}>
        {/* Universal Search Trigger */}
        <div className="relative" ref={searchWrapRef}>
          <button
            type="button"
            onClick={() => setSearchOpen((current) => !current)}
            className="hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-white text-xs font-medium transition cursor-pointer"
            aria-label="Open universal search"
            title="Search (⌘K)"
          >
            <Search size={14} className="text-slate-400 shrink-0" />
            <span className="hidden lg:inline">Search records...</span>
            <span className="lg:hidden">Search...</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-white border border-slate-200 rounded text-slate-400">⌘K</kbd>
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen((current) => !current)}
            className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Open universal search"
            title="Search"
          >
            <Search size={19} />
          </button>

          {searchOpen ? (
            <>
              <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[500]" 
                onClick={() => setSearchOpen(false)} 
              />
              <div className="fixed inset-x-3 sm:inset-x-6 top-3 sm:top-6 md:top-10 z-[510] max-w-2xl mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="border-b border-slate-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden xs:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600">
                      <span>Search</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">▼</span>
                    </div>
                    <Search size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search customers, leads, jobs..."
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                      value={searchValue}
                      onChange={(e) => {
                        setSearchValue(e.target.value);
                        setSearchTab('all');
                        setSelectedIndex(0);
                        setLiveSearchResults([]);
                      }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setSearchOpen(false);
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedIndex((prev) => Math.min(prev + 1, filteredSearchResults.length - 1));
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedIndex((prev) => Math.max(prev - 1, 0));
                        }
                        if (e.key === 'Enter' && filteredSearchResults[selectedIndex]) {
                          e.preventDefault();
                          handleSearchSelect(filteredSearchResults[selectedIndex]);
                        }
                      }}
                    />
                    {searchLoading ? <Loader2 size={12} className="animate-spin text-slate-400 shrink-0" /> : null}
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                      aria-label="Close search"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="border-b border-slate-200 bg-white px-3 sm:px-4">
                  <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto custom-scrollbar">
                    {searchTabOptions.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setSearchTab(tab.id);
                          setSelectedIndex(0);
                        }}
                        className={`relative whitespace-nowrap py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                          searchTab === tab.id ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                        <span className={`ml-1.5 sm:ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          searchTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {tab.count}
                        </span>
                        <span className={`absolute bottom-0 left-0 h-0.5 w-full ${searchTab === tab.id ? 'bg-primary' : 'bg-transparent'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto bg-white custom-scrollbar">
                  {searchLoading && !searchResults.length ? (
                    <div className="p-4 text-sm text-slate-400">Searching customers and CRM records...</div>
                  ) : null}
                  {!filteredSearchResults.length && !searchLoading ? (
                    <div className="p-4 text-sm text-slate-400">No results.</div>
                  ) : null}

                  {filteredSearchResults.length ? (
                    <div className="space-y-3 p-3 sm:p-4">
                      {['customer', 'lead', 'opportunity', 'job', 'other']
                        .map((type) => {
                          const rows = filteredSearchResults.filter((row) => {
                            const rowType = String(row.type || '').toLowerCase();
                            if (type === 'other') return !['customer', 'lead', 'opportunity', 'job'].includes(rowType);
                            return rowType === type;
                          });
                          if (!rows.length) return null;
                          const heading = type === 'customer' ? 'Customer Profiles' : type === 'lead' ? 'Leads' : type === 'opportunity' ? 'Opportunities' : type === 'job' ? 'Jobs' : 'Other';
                          const Icon = type === 'customer' ? UserIcon : type === 'lead' ? Target : type === 'opportunity' ? Layers : type === 'job' ? Truck : Zap;
                          return (
                            <section key={type} className="overflow-hidden rounded-xl border border-slate-200">
                              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <Icon size={13} />
                                {heading}
                              </div>
                              <div className="divide-y divide-slate-100">
                                {rows.map((row, index) => {
                                  const globalIndex = filteredSearchResults.findIndex((entry) => entry === row);
                                  return (
                                    <button
                                      key={`${row.type}-${row.label}-${index}`}
                                      type="button"
                                      onClick={() => handleSearchSelect(row)}
                                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                                      className={`grid w-full grid-cols-1 sm:grid-cols-[100px_minmax(0,1.4fr)_minmax(0,1fr)] items-start sm:items-center gap-1 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5 text-left transition-colors cursor-pointer ${
                                        globalIndex === selectedIndex ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="min-w-0 text-xs sm:text-sm text-slate-600">
                                        <div className="inline-flex items-center gap-2">
                                          <span className="truncate">{getSearchSecondary(row)}</span>
                                          <span
                                            aria-label={`Open ${row.label} in new tab`}
                                            title="Open in new tab"
                                            className="shrink-0 rounded-full p-1 text-blue-600 hover:bg-blue-100"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleSearchOpenNewTab(row);
                                            }}
                                          >
                                            ↗
                                          </span>
                                        </div>
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <div className="truncate text-xs sm:text-sm font-semibold text-blue-700">{row.label}</div>
                                          <span className="text-blue-500 text-xs">↗</span>
                                        </div>
                                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                          {row.type}
                                        </div>
                                      </div>
                                      <div className="min-w-0 truncate text-xs text-slate-500">
                                        {getSearchSubtitle(row) || '—'}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })
                        .filter(Boolean)}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
          {/* Notifications Dropdown */}
          <div className="relative">
            {/* <button 
              type="button"
              onClick={() => toggleDropdown('notifications')}
              className={`relative hover:text-primary transition-colors p-1.5 rounded-full ${openDropdown === 'notifications' ? 'text-primary bg-black/5' : ''}`}
            >
              <Bell size={20} className="md:w-5.5 md:h-5.5" />
              {unreadNotifications > 0 ? (
                <span
                  className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary-light text-black border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black leading-none"
                  title={`${unreadNotifications} unread`}
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              ) : null}
            </button> */}

            {openDropdown === 'notifications' && (
              <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 w-auto sm:w-72 md:w-80 max-w-[calc(100vw-1rem)] bg-brand-surface rounded-2xl shadow-xl border border-brand-border overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-brand-sidebar border-b border-brand-border flex justify-between items-center">
                  <h3 className="font-bold text-content-main">Notifications</h3>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleMarkAllRead} className="text-[0.625rem] font-bold text-primary uppercase tracking-wider">Mark all read</button>
                    <button type="button" onClick={() => setOpenDropdown(null)} className="p-1 text-content-sec hover:text-content-main sm:hidden transition-colors" title="Close">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2 border-b border-brand-border bg-white">
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'unread', label: 'Unread' },
                      { id: 'read', label: 'Read' },
                    ].map((t) => {
                      const active = notificationFilter === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setNotificationFilter(t.id)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${
                            active ? 'bg-primary/10 text-primary' : 'bg-black/5 text-content-sec hover:text-content-main'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="max-h-[calc(100vh-14rem)] sm:max-h-96 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="p-4 text-sm text-content-sec flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </div>
                  ) : null}
                  {!loadingNotifications && filteredNotifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-content-sec">No notifications.</div>
                  ) : null}
                  {!loadingNotifications ? (
                    orderedNotificationCategories.map((categoryKey) => {
                      const rows = groupedNotifications[categoryKey] || [];
                      const categoryLabel = NOTIFICATION_CATEGORY_META[categoryKey]?.label || 'Other';
                      const CategoryIcon = NOTIFICATION_CATEGORY_META[categoryKey]?.icon || AlertCircle;

                      return (
                        <div key={categoryKey} className="border-t border-brand-border first:border-t-0">
                          <div className="flex items-center justify-between px-3 py-2 bg-brand-sidebar/30">
                            <div className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-widest text-content-sec">
                              <CategoryIcon size={12} />
                              {categoryLabel}
                            </div>
                            <div className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-content-sec">
                              {rows.length}
                            </div>
                          </div>
                          {rows.map((n) => {
                            const RowCategoryIcon = getNotificationCategoryIcon(n);
                            return (
                              <DropdownItem
                                key={n.id}
                                icon={notificationIcon(n)}
                                label={getNotificationLabel(n)}
                                description={n.message || ''}
                                category={categoryLabel}
                                categoryIcon={RowCategoryIcon}
                                timestamp={formatTimestamp(n.created_at)}
                                unread={!n.read_at}
                                branchName={n.branch_name}
                                assignedTo={n.assigned_to}
                                actionLabel={n.read_at ? 'Mark unread' : 'Mark read'}
                                onAction={async () => {
                                  try {
                                    if (n.read_at) {
                                      await markNotificationUnread(n.id);
                                      setNotifications((prev) => prev.map((row) => (row.id === n.id ? { ...row, read_at: null } : row)));
                                    } else {
                                      await markNotificationRead(n.id);
                                      setNotifications((prev) =>
                                        prev.map((row) => (row.id === n.id ? { ...row, read_at: row.read_at || new Date().toISOString() } : row))
                                      );
                                    }
                                    fetchNotifications({ silent: true });
                                  } catch {
                                    // ignore
                                  }
                                }}
                                onClick={() => {
                                  const nextUrl = n.url;
                                  const finalizeNavigate = () => {
                                    if (nextUrl) navigate(nextUrl);
                                    setOpenDropdown(null);
                                  };
                                  if (n.read_at) {
                                    finalizeNavigate();
                                    return;
                                  }
                                  markNotificationRead(n.id)
                                    .then(() => {
                                      setNotifications((prev) =>
                                        prev.map((row) => (row.id === n.id ? { ...row, read_at: row.read_at || new Date().toISOString() } : row))
                                      );
                                      fetchNotifications({ silent: true });
                                    })
                                    .catch(() => {})
                                    .finally(finalizeNavigate);
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })
                  ) : null}
                </div>
                <button 
                  className="w-full p-3 bg-brand-sidebar text-xs font-bold text-content-sec hover:text-primary transition-colors"
                  onClick={() => {
                    navigate(`/notifications?filter=${notificationFilter}&category=${notificationClassFilter}`);
                    setOpenDropdown(null);
                  }}
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>

          {NOTIFICATION_PANEL_DEFS.slice(1).map((panel) => {
            const unreadCount = getUnreadCountForCategories(panel.categories || []);
            const isOpen = openDropdown === panel.id;
            const groupKind = panel.id === 'notifications-comms' ? 'comms' : panel.id === 'notifications-updates' ? 'updates' : 'followups';
            return (
              <div key={panel.id} className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown(panel.id)}
                  className={`relative p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
                    isOpen ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={panel.label}
                  aria-label={panel.label}
                >
                  <NotificationGroupIcon kind={groupKind} />
                  {unreadCount > 0 ? (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-gradient-to-r from-[#f5a85b] to-[#f6cfcb] text-slate-900 font-extrabold rounded-full flex items-center justify-center text-[9px] leading-none shadow-2xs"
                      title={`${unreadCount} unread`}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </button>

                {isOpen && (
                  <NotificationInboxPopup 
                    id={panel.id}
                    label={panel.label}
                    icon={NotificationGroupIcon}
                    categories={panel.categories}
                    onClose={() => setOpenDropdown(null)}
                  />
                )}
              </div>
            );
          })}

          {/* Messages Dropdown */}
          {/* <div className="relative hidden sm:block">
            <button 
              type="button"
              onClick={() => toggleDropdown('messages')}
              className={`hover:text-primary transition-colors p-1.5 rounded-full ${openDropdown === 'messages' ? 'text-primary bg-black/5' : ''}`}
              title="Communication Logs"
            >
              <Mail size={20} className="md:w-5.5 md:h-5.5" />
            </button>

            {openDropdown === 'messages' && (
              <div className="absolute right-0 mt-3 w-72 md:w-80 bg-brand-surface rounded-2xl shadow-xl border border-brand-border overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-brand-sidebar border-b border-brand-border flex justify-between items-center">
                  <h3 className="font-bold text-content-main">Sent Communications</h3>
                  {loadingComm && <Loader2 size={16} className="animate-spin text-primary" />}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {commRecords.length === 0 && !loadingComm ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-content-sec">No recent communications found.</p>
                    </div>
                  ) : (
                    commRecords.map((record) => {
                      const isEmail = record.activity_type === 'email';
                      const label = getCommLabel(record);
                      const description = getCommDescription(record);
                      
                      return (
                        <DropdownItem 
                          key={record.id}
                          icon={isEmail ? Mail : Phone} 
                          label={label}
                          description={description}
                          timestamp={formatTimestamp(record.created_at)}
                          onClick={() => {
                            if (record.opportunity) navigate(getLegacyRecordDetailPath('opportunity', record.opportunity));
                            else if (record.lead) navigate(getLegacyRecordDetailPath('lead', record.lead));
                            setOpenDropdown(null);
                          }}
                        />
                      );
                    })
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => { navigate('/crm/activities'); setOpenDropdown(null); }}
                  className="w-full p-3 bg-brand-sidebar text-xs font-bold text-content-sec hover:text-primary transition-colors"
                >
                  View All Activity
                </button>
              </div>
            )}
          </div> */}

          {/* Follow-ups Dropdown */}
          {/* <div className="relative hidden sm:block">
            <button 
              type="button"
              onClick={() => toggleDropdown('followups')}
              className={`hover:text-primary transition-colors p-1.5 rounded-full ${openDropdown === 'followups' ? 'text-primary bg-black/5' : ''}`}
              title="Reminders & Follow-ups"
            >
              <Clock size={20} className="md:w-5.5 md:h-5.5" />
            </button>

            {openDropdown === 'followups' && (
              <div className="absolute right-0 mt-3 w-72 md:w-80 bg-brand-surface rounded-2xl shadow-xl border border-brand-border overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-brand-sidebar border-b border-brand-border flex justify-between items-center">
                  <h3 className="font-bold text-content-main">Follow-up Reminders</h3>
                  {loadingFollowUps && <Loader2 size={16} className="animate-spin text-primary" />}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {followUps.length === 0 && !loadingFollowUps ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-content-sec">No pending follow-ups found.</p>
                    </div>
                  ) : (
                    followUps.map((task) => {
                      const label = task.activity_details?.subject || task.task_type || 'Follow-up';
                      const description = task.notes || task.activity_details?.description || '';
                      
                      return (
                        <DropdownItem 
                          key={task.id}
                          icon={CheckSquare} 
                          label={label}
                          description={description}
                          timestamp={task.due_date ? (() => {
                            const [year, month, day] = String(task.due_date).slice(0, 10).split('-').map(Number);
                            const date = year && month && day ? new Date(year, month - 1, day) : new Date(task.due_date);
                            return Number.isNaN(date.getTime()) ? String(task.due_date) : date.toLocaleDateString();
                          })() : 'TBD'}
                          onClick={() => {
                            if (task.opportunity) navigate(getLegacyRecordDetailPath('opportunity', task.opportunity));
                            else if (task.lead) navigate(getLegacyRecordDetailPath('lead', task.lead));
                            setOpenDropdown(null);
                          }}
                        />
                      );
                    })
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => { navigate('/crm/tasks'); setOpenDropdown(null); }}
                  className="w-full p-3 bg-brand-sidebar text-xs font-bold text-content-sec hover:text-primary transition-colors"
                >
                  View All Tasks
                </button>
              </div>
            )}
          </div> */}



          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} className="sm:w-5 sm:h-5 text-yellow-500" /> : <Moon size={18} className="sm:w-5 sm:h-5 text-slate-600" />}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => toggleDropdown('profile')}
              className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer"
              aria-label="User Profile menu"
            >
              <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${openDropdown === 'profile' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-800 border border-slate-200/80 hover:border-slate-300'}`}>
                {getInitials()}
              </div>
            </button>

            {openDropdown === 'profile' && (
              <div className="absolute right-0 mt-2 sm:mt-3 w-56 sm:w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-150">
                {!showCompanyList ? (
                  <>
                    <div className="p-4 bg-brand-sidebar">
                      <p className="text-sm font-bold text-content-main truncate">{fullName}</p>
                      <p className="text-xs text-content-sec truncate">{user?.employee_type || 'Team Member'}</p>
                    </div>
                    <div className="p-1">
                      <DropdownItem 
                        icon={UserIcon} 
                        label="My Profile" 
                        onClick={() => { navigate('/profile'); setOpenDropdown(null); }} 
                      />
                      {(user?.is_superuser || user?.is_system_admin) && (
                        <DropdownItem 
                          icon={Building2} 
                          label="Switch to Company" 
                          rightIcon={ChevronRight}
                          onClick={() => {
                            setShowCompanyList(true);
                            fetchCompaniesList();
                          }} 
                        />
                      )}

                      <DropdownItem 
                        icon={Settings} 
                        label="Settings" 
                        onClick={() => { navigate('/settings'); setOpenDropdown(null); }} 
                      />
                      <div className="h-px bg-brand-border my-1" />
                      <DropdownItem icon={LogOut} label="Logout" onClick={onLogout} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-brand-sidebar border-b border-brand-border flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setShowCompanyList(false)}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-content-main transition-colors flex items-center justify-center"
                        title="Back to profile menu"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div>
                        <h4 className="text-xs font-bold text-content-main">Switch Company</h4>
                        <p className="text-[10px] text-content-sec">Select an organization</p>
                      </div>
                    </div>
                    <div className="p-1 max-h-64 overflow-y-auto">
                      {loadingCompanies ? (
                        <div className="flex items-center justify-center p-6 text-content-sec gap-2 text-xs">
                          <Loader2 className="animate-spin" size={16} />
                          <span>Loading companies...</span>
                        </div>
                      ) : companies.length === 0 ? (
                        <div className="p-6 text-center text-xs text-content-sec">
                          No companies found
                        </div>
                      ) : (
                        companies.map((company) => {
                          const isSelected = String(selectedCompanyId || '') === String(company.id);
                          const companyName = company.name || company.legal_name || 'Company';
                          const subtitle = company.subdomain 
                            ? `${company.subdomain}.moverscrm.com` 
                            : company.city 
                            ? `${company.city}${company.state ? `, ${company.state}` : ''}`
                            : undefined;
                          const itemClassName = isSelected
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm hover:bg-primary/15'
                            : 'text-content-main';

                          return (
                            <DropdownItem
                              key={company.id || companyName}
                              icon={Building2}
                              label={companyName}
                              description={subtitle}
                              rightIcon={isSelected ? Check : null}
                              unread={isSelected}
                              className={itemClassName}
                              onClick={async () => {
                                try {
                                  await switchCompany(company.id);
                                  setSelectedCompanyId(company.id);
                                  localStorage.setItem('active_company_id', String(company.id));
                                  window.dispatchEvent(new CustomEvent('app:tenant-changed', { detail: { companyId: company.id } }));
                                  toast.success(`Switched to ${companyName}`);
                                  setOpenDropdown(null);
                                  setShowCompanyList(false);
                                } catch (error) {
                                  toast.error(error?.response?.data?.detail || 'Failed to switch company');
                                }
                              }}
                            />
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions Dropdown */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => toggleDropdown('actions')}
              className={`p-1.5 sm:p-2 md:p-2.5 rounded-xl transition-all shadow-xs cursor-pointer ml-0.5 sm:ml-1 ${openDropdown === 'actions' ? 'rotate-45' : ''}`}
              style={{ background: 'linear-gradient(90deg, #f5a85b, #f6cfcb)', color: '#000000' }}
              title="Quick Actions"
              aria-label="Quick Actions"
            >
              <Plus size={17} className="text-black sm:w-[18px] sm:h-[18px]" />
            </button>

            {openDropdown === 'actions' && (
              <div className="absolute right-0 mt-2 sm:mt-3 w-56 sm:w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-4 bg-brand-sidebar border-b border-brand-border">
                  <h3 className="font-bold text-content-main">Quick Actions</h3>
                </div>
                <div className="p-1">
                  <DropdownItem 
                    icon={UserPlus} 
                    label="Add New Lead" 
                    onClick={() => { navigate('/leads/new'); setOpenDropdown(null); }}
                  />
                  <DropdownItem icon={FilePlus} label="Create Quote" />
                  <DropdownItem icon={ClipboardPlus} label="Book a Job" />
                  <DropdownItem icon={CheckSquare} label="Add Task" />
                </div>
              </div>
            )}
          </div>
        </div>
    </header>
    </>
  );
};

export default Header;
