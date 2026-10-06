import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markNotificationUnread, markAllNotificationsRead, updateTask } from '../../services/api';
import { Loader2, Check, Clock, UserPlus, FileCheck, Mail, MessageSquare, AlertCircle, RefreshCw, Briefcase, Bell, X } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  email: Mail,
  sms: MessageSquare,
  lead: UserPlus,
  update: FileCheck,
  followup: Clock,
  job: Briefcase,
  error: AlertCircle,
  other: Bell,
};

const NotificationInboxPopup = ({ label, icon: Icon, categories, onClose }) => {
  const [activeTab, setActiveTab] = useState('unread'); // 'unread' | 'read'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate/make API call using category filter
      const categoryParam = categories.length === 1 ? categories[0] : undefined;
      const res = await getNotifications({
        limit: 100,
        category: categoryParam,
      });
      let data = Array.isArray(res) ? res : res?.results || [];
      
      // Client-side fallback filtering if API doesn't fully support category filtering
      if (categories.length > 0 && !categories.includes('all')) {
        data = data.filter(n => categories.includes(n.category || getFallbackCategory(n)));
      }
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch inbox records', err);
    } finally {
      setLoading(false);
    }
  }, [categories]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Derived state
  const displayedRecords = useMemo(() => {
    return records.filter(r => activeTab === 'unread' ? !r.read_at : !!r.read_at);
  }, [records, activeTab]);

  const followUpSections = useMemo(() => {
    if (!categories.includes('followup')) return null;
    const now = new Date();
    const overdue = [], today = [], upcoming = [];
    
    displayedRecords.forEach(r => {
      if (!r.due_at) {
        upcoming.push(r);
        return;
      }
      const dueDate = new Date(r.due_at);
      if (dueDate < now && dueDate.toDateString() !== now.toDateString()) {
        overdue.push(r);
      } else if (dueDate.toDateString() === now.toDateString()) {
        today.push(r);
      } else {
        upcoming.push(r);
      }
    });
    return { overdue, today, upcoming };
  }, [displayedRecords, categories]);

  const handleActionClick = async (e, record, action) => {
    e.stopPropagation();
    try {
      if (action === 'read') {
        await markNotificationRead(record.id);
        setRecords(prev => prev.map(r => r.id === record.id ? { ...r, read_at: new Date().toISOString() } : r));
      } else if (action === 'unread') {
        await markNotificationUnread(record.id);
        setRecords(prev => prev.map(r => r.id === record.id ? { ...r, read_at: null } : r));
      } else if (action === 'complete') {
        if (record.entity_id) {
          await updateTask(record.entity_id, { status: 'completed' });
          toast.success("Task completed");
          fetchRecords();
        } else {
          toast.error("No valid task linked");
        }
      } else if (action === 'snooze') {
        if (record.entity_id) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          await updateTask(record.entity_id, { due_date: nextWeek.toISOString() });
          toast.success("Task snoozed for 7 days");
          fetchRecords();
        } else {
          toast.error("No valid task linked");
        }
      }
    } catch {
      toast.error("Action failed");
    }
  };

  const renderCard = (record) => {
    const isUnread = !record.read_at;
    const isFollowup = categories.includes('followup');
    const CategoryIcon = CATEGORY_ICONS[record.category || getFallbackCategory(record)] || Icon || Bell;
    
    return (
      <div 
        key={record.id}
        onClick={() => {
          if (record.action_url) navigate(record.action_url);
          else if (record.url) navigate(record.url);
          onClose();
        }}
        className={`p-3 border-b border-brand-border hover:bg-slate-50 cursor-pointer flex gap-3 transition-colors ${isUnread ? 'bg-primary/5' : ''}`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(record.action_url || record.url)}
      >
        <div className="pt-1 text-content-sec">
          <CategoryIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between">
            <h4 className={`text-sm truncate ${isUnread ? 'font-bold text-content-main' : 'font-medium text-content-sec'}`}>
              {record.record_label && <span className="text-primary mr-1">{record.record_label}</span>}
              {record.customer_name || record.title}
            </h4>
            <span className="text-[10px] text-content-sec whitespace-nowrap">
              {record.created_at ? new Date(record.created_at).toLocaleDateString() : ''}
            </span>
          </div>
          <p className="text-xs text-content-sec line-clamp-1 mt-0.5">
            {record.subject_preview || record.message}
          </p>
          
          {/* Tags & Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {record.assignment_state === 'Assigned' && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[9px] uppercase font-bold tracking-wider">
                Assigned
              </span>
            )}
            
            <div className="flex-1" />
            
            {isFollowup && (
              <>
                <button 
                  onClick={(e) => handleActionClick(e, record, 'complete')}
                  className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-[10px] font-bold transition-colors"
                >
                  <Check size={12} className="inline mr-1" /> Complete
                </button>
                <button 
                  onClick={(e) => handleActionClick(e, record, 'snooze')}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition-colors"
                >
                  <Clock size={12} className="inline mr-1" /> Snooze
                </button>
              </>
            )}
            <button 
              onClick={(e) => handleActionClick(e, record, isUnread ? 'read' : 'unread')}
              className="px-2 py-1 bg-black/5 hover:bg-black/10 text-content-sec rounded text-[10px] font-bold transition-colors"
            >
              Mark {isUnread ? 'Read' : 'Unread'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 w-auto sm:w-[26rem] md:w-[30rem] max-w-[calc(100vw-1rem)] bg-brand-surface rounded-2xl shadow-xl border border-brand-border overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 bg-brand-sidebar border-b border-brand-border flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-content-main">
          <Icon size={18} className="text-primary" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRecords} className="p-1 text-content-sec hover:text-primary transition-colors" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 text-content-sec hover:text-content-main sm:hidden transition-colors" title="Close">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white border-b border-brand-border flex">
        <button 
          onClick={() => setActiveTab('unread')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${activeTab === 'unread' ? 'border-primary text-primary' : 'border-transparent text-content-sec hover:text-content-main'}`}
        >
          Requires Action
        </button>
        <button 
          onClick={() => setActiveTab('read')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${activeTab === 'read' ? 'border-primary text-primary' : 'border-transparent text-content-sec hover:text-content-main'}`}
        >
          Completed / Read
        </button>
      </div>

      <div className="max-h-[calc(100vh-14rem)] sm:max-h-96 overflow-y-auto bg-white">
        {loading ? (
          <div className="p-8 flex justify-center text-content-sec"><Loader2 className="animate-spin" /></div>
        ) : displayedRecords.length === 0 ? (
          <div className="p-8 text-center text-content-sec text-sm">No {activeTab} items in this inbox.</div>
        ) : followUpSections ? (
          <>
            {followUpSections.overdue.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider sticky top-0">Overdue</div>
                {followUpSections.overdue.map(renderCard)}
              </div>
            )}
            {followUpSections.today.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider sticky top-0">Due Today</div>
                {followUpSections.today.map(renderCard)}
              </div>
            )}
            {followUpSections.upcoming.length > 0 && (
              <div>
                <div className="px-3 py-1 bg-slate-50 text-content-sec text-[10px] font-black uppercase tracking-wider sticky top-0">Upcoming</div>
                {followUpSections.upcoming.map(renderCard)}
              </div>
            )}
          </>
        ) : (
          displayedRecords.map(renderCard)
        )}
      </div>
      
      <div className="bg-brand-sidebar border-t border-brand-border p-2">
        <button 
          onClick={async () => {
            const unreadRecords = records.filter(r => !r.read_at);
            if (unreadRecords.length === 0) {
              toast.info("Notification list is empty");
              return;
            }
            try {
              await markAllNotificationsRead();
              fetchRecords();
              toast.success("All notifications marked as read");
            } catch {
              toast.error("Failed to mark all as read");
            }
          }}
          className="w-full py-2 text-xs font-bold text-content-sec hover:text-primary transition-colors"
        >
          Mark all read
        </button>
      </div>
    </div>
  );
};

export default NotificationInboxPopup;

function getFallbackCategory(notification) {
  const entity = String(notification?.entity_type || '').toLowerCase();
  if (entity === 'inbound_email') return 'email';
  if (entity === 'inbound_sms') return 'sms';
  if (entity === 'lead') return 'lead';
  if (['estimate', 'payment_request', 'inventory'].includes(entity)) return 'update';
  if (['task', 'followup'].includes(entity)) return 'followup';
  return 'other';
}
