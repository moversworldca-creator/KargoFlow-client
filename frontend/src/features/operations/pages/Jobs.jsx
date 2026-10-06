import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Clock,
  Calendar,
  CalendarDays,
  Check,
  X,
  Truck,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import { getLookupUsersPage } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { getRecordDetailPath } from '../../crm/utils/recordRoutes';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import { PERMISSIONS } from '../../../shared/permissions/registry';

const Jobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAll } = useCan();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobActionBusy, setJobActionBusy] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [nextJobDate, setNextJobDate] = useState(null);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const datePickerRef = useRef(null);
  const [calendarMetric, setCalendarMetric] = useState('Booked');
  const [dispatchError, setDispatchError] = useState('');
  const [users, setUsers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [crewDraft, setCrewDraft] = useState({ user_id: '', role: 'mover' });
  const [truckDraft, setTruckDraft] = useState({ truck_id: '' });
  const [scheduleDraft, setScheduleDraft] = useState({
    start_time: '',
    end_time: '',
    arrival_window_start: '',
    arrival_window_end: '',
  });

  const userBranchId = useMemo(() => {
    const branch = user?.branch_id ?? user?.branch?.id ?? null;
    return branch ? String(branch) : '';
  }, [user]);

  const toYmd = (d) => {
    const yearVal = d.getFullYear();
    const monthVal = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return `${yearVal}-${monthVal}-${dayVal}`;
  };

  const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  };

  const getDaysOfWeek = (d) => {
    const start = getStartOfWeek(d);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      days.push(current);
    }
    return days;
  };

  const nextDate = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else if (viewMode === 'day') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const prevDate = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else if (viewMode === 'day') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const isViewingToday = useMemo(() => {
    return toYmd(currentDate) === toYmd(new Date());
  }, [currentDate]);

  const today = (mode) => {
    setCurrentDate(new Date());
    if (mode && typeof mode === 'string') setViewMode(mode);
    setShowDateMenu(false);
  };

  const jumpToTomorrow = (mode) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
    if (mode && typeof mode === 'string') setViewMode(mode);
    setShowDateMenu(false);
  };

  const jumpToYesterday = (mode) => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
    if (mode && typeof mode === 'string') setViewMode(mode);
    setShowDateMenu(false);
  };

  const jumpToThisWeek = () => {
    setCurrentDate(new Date());
    setViewMode('week');
    setShowDateMenu(false);
  };

  const jumpToThisMonth = () => {
    setCurrentDate(new Date());
    setViewMode('month');
    setShowDateMenu(false);
  };

  const jumpToSpecificDate = (val, mode) => {
    if (!val) return;
    const [y, m, d] = String(val).split('-').map(Number);
    if (y && m && d) {
      setCurrentDate(new Date(y, m - 1, d));
      if (mode && typeof mode === 'string') setViewMode(mode);
    }
    setShowDateMenu(false);
  };

  // Fetch jobs for the current range
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      let firstDay, lastDay;
      if (viewMode === 'month') {
        firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      } else if (viewMode === 'week') {
        const start = new Date(currentDate);
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        firstDay = start;
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        lastDay = end;
      } else {
        firstDay = new Date(currentDate);
        lastDay = new Date(currentDate);
      }

      const [jobsResponse, oppsResponse] = await Promise.all([
        API.jobs.getJobs({
          status: 'booked,confirmed,completed',
          date_from: toYmd(firstDay),
          date_to: toYmd(lastDay),
          ...(selectedBranchId ? { branch: selectedBranchId } : userBranchId ? { branch: userBranchId } : {}),
        }),
        API.sales.getOpportunities({
          date_from: toYmd(firstDay),
          date_to: toYmd(lastDay),
          status: 'new,active,estimating,estimate_sent,estimating_complete,negotiating',
          ...(selectedBranchId ? { branch: selectedBranchId } : userBranchId ? { branch: userBranchId } : {}),
        })
      ]);

      const jobRows = (Array.isArray(jobsResponse) ? jobsResponse : jobsResponse?.results || [])
        .filter(job => !['canceled', 'lost'].includes(String(job.status || '').toLowerCase()));
      const oppRows = (Array.isArray(oppsResponse) ? oppsResponse : oppsResponse?.results || [])
        .filter(opp => !['canceled', 'lost'].includes(String(opp.status || '').toLowerCase()))
        .map(opp => ({
          ...opp,
          id: `opp-${opp.id}`,
          status: 'opportunity',
          branch_id: opp.branch,
          name: opp.customer_details ? `${opp.customer_details.first_name} ${opp.customer_details.last_name}`.trim() : opp.opportunity_number,
          customer_name: opp.customer_details ? `${opp.customer_details.first_name} ${opp.customer_details.last_name}`.trim() : opp.opportunity_number,
          display_number: opp.opportunity_number,
          job_type: opp.service_type || 'Opportunity',
          origin: opp.origin_address_details ? `${opp.origin_address_details.city}, ${opp.origin_address_details.state}` : '',
          destination: opp.destination_address_details ? `${opp.destination_address_details.city}, ${opp.destination_address_details.state}` : '',
        }));

      const allItems = [...jobRows, ...oppRows];
      setJobs(allItems);
      setNextJobDate(null);

      if (!allItems.length) {
        const todayVal = new Date();
        const future = new Date(todayVal.getFullYear(), todayVal.getMonth(), todayVal.getDate() + 90);
        const upcomingRes = await API.jobs.getJobs({
          status: 'booked,confirmed,completed',
          date_from: toYmd(todayVal),
          date_to: toYmd(future),
          ...(selectedBranchId ? { branch: selectedBranchId } : userBranchId ? { branch: userBranchId } : {}),
        });
        const upcoming = Array.isArray(upcomingRes) ? upcomingRes : upcomingRes?.results || [];
        const dates = upcoming
          .map((j) => j.move_date)
          .filter(Boolean)
          .sort();
        setNextJobDate(dates[0] || null);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, selectedBranchId, userBranchId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await API.general.getBranches();
        const rows = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
        setBranches(rows);
      } catch (error) {
        console.error('Error fetching branches:', error);
        setBranches([]);
      }
    };
    loadBranches();
  }, []);

  // Branch selection removed to allow All Branches default
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthTitle = `${monthName} ${year}`;
  const monthStartDate = new Date(year, month, 1);
  const monthGridStart = new Date(year, month, 1 - monthStartDate.getDay());
  const monthCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(monthGridStart);
    date.setDate(monthGridStart.getDate() + index);
    return {
      date,
      day: date.getDate(),
      dateKey: toYmd(date),
      currentMonth: date.getMonth() === month,
      isToday: toYmd(date) === toYmd(new Date()),
    };
  });

  // Group jobs by date and filter by search query
  const filteredJobs = jobs.filter(job => {
    const status = String(job.status || '').toLowerCase();
    if (status === 'canceled' || status === 'lost') return false;
    if (selectedBranchId && String(job.branch_id || '') !== String(selectedBranchId)) return false;
    if (selectedJobType && String(job.job_type || '') !== String(selectedJobType)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (job.name && job.name.toLowerCase().includes(query)) ||
      (job.origin && job.origin.toLowerCase().includes(query)) ||
      (job.destination && job.destination.toLowerCase().includes(query)) ||
      (job.display_number && job.display_number.toLowerCase().includes(query))
    );
  });

  const visibleCalendarJobs = useMemo(() => {
    if (calendarMetric === 'Opportunity') {
      return filteredJobs.filter((job) => String(job.status || '').toLowerCase() === 'opportunity');
    }
    if (calendarMetric === 'Booked') {
      return filteredJobs.filter((job) => ['booked', 'confirmed', 'completed'].includes(String(job.status || '').toLowerCase()));
    }
    return filteredJobs;
  }, [filteredJobs, calendarMetric]);

  const calendarJobsByDate = useMemo(() => {
    return visibleCalendarJobs.reduce((acc, job) => {
      const dateKey = calendarMetric === 'End Date'
        ? (job.end_date || job.move_date || '')
        : (job.move_date || job.end_date || '');
      if (!dateKey) return acc;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(job);
      return acc;
    }, {});
  }, [visibleCalendarJobs, calendarMetric]);

  const jobTypeOptions = Array.from(
    new Set(
      jobs
        .map((j) => String(j?.job_type || '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const summaryOptions = [
    { value: 'Summary', label: 'Summary' },
    { value: 'Booked', label: 'Booked' },
    { value: 'Opportunity', label: 'Opportunity' },
    { value: 'End Date', label: 'End Date' },
  ];

  const selectedDateJobs = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return calendarJobsByDate[selectedCalendarDate] || [];
  }, [selectedCalendarDate, calendarJobsByDate]);

  const conflictMap = buildJobConflictMap(calendarJobsByDate);

  const getStatusColor = (stage) => {
    switch (stage) {
      case 'opportunity': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'booked': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'canceled': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCalendarAccent = (job) => {
    const stage = String(job?.status || '').toLowerCase();
    const isTimed = !!(job?.start_time || job?.end_time);

    if (stage === 'opportunity') return 'border-violet-300 text-violet-700 bg-violet-50';
    if (stage === 'confirmed') return 'border-emerald-300 text-emerald-700 bg-emerald-50';
    if (stage === 'completed') return 'border-slate-300 text-slate-700 bg-slate-50';
    if (stage === 'canceled') return 'border-rose-300 text-rose-700 bg-rose-50';
    if (!isTimed) return 'border-amber-300 text-amber-800 bg-amber-50';
    return 'border-blue-300 text-blue-700 bg-blue-50';
  };

  const getJobTimeLabel = (job) => {
    if (job?.start_time && job?.end_time) return `${job.start_time} - ${job.end_time}`;
    if (job?.start_time) return `${job.start_time} start`;
    if (job?.end_time) return `Ends ${job.end_time}`;
    return 'No time set';
  };

  const getArrivalWindowLabel = (job) => {
    if (job?.arrival_window_start && job?.arrival_window_end) {
      return `${job.arrival_window_start} - ${job.arrival_window_end}`;
    }
    if (job?.arrival_window_start) return `From ${job.arrival_window_start}`;
    if (job?.arrival_window_end) return `Until ${job.arrival_window_end}`;
    return '';
  };

  const getLoadLabel = (job) => {
    const crewCount = job?.crew_assignments?.length || 0;
    const truckCount = job?.truck_assignments?.length || 0;
    const parts = [];
    if (crewCount) parts.push(`${crewCount} crew`);
    if (truckCount) parts.push(`${truckCount} truck${truckCount === 1 ? '' : 's'}`);
    return parts.join(' / ');
  };

  function normalizeTime(value) {
    return String(value || '').trim().slice(0, 5);
  }

  function timeToMinutes(value) {
    const time = normalizeTime(value);
    if (!time || !time.includes(':')) return null;
    const [hourRaw, minuteRaw] = time.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  }

  function formatMinutesLabel(minutes) {
    if (!Number.isFinite(minutes)) return '';
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const hour12 = ((hour24 + 11) % 12) + 1;
    const suffix = hour24 >= 12 ? 'PM' : 'AM';
    return minute === 0
      ? `${hour12}${suffix}`
      : `${hour12}:${String(minute).padStart(2, '0')}${suffix}`;
  }

  function getJobTimelineMeta(job) {
    const startMinutes = timeToMinutes(job?.start_time);
    const endMinutes = timeToMinutes(job?.end_time);
    const arrivalStartMinutes = timeToMinutes(job?.arrival_window_start);
    const arrivalEndMinutes = timeToMinutes(job?.arrival_window_end);
    const hasTimedValues = startMinutes !== null || endMinutes !== null;
    const fallbackStart = arrivalStartMinutes ?? startMinutes ?? 8 * 60;
    let resolvedStart = startMinutes ?? fallbackStart;
    let resolvedEnd = endMinutes ?? arrivalEndMinutes ?? (resolvedStart + 90);

    if (!Number.isFinite(resolvedStart)) resolvedStart = 8 * 60;
    if (!Number.isFinite(resolvedEnd)) resolvedEnd = resolvedStart + 90;
    if (resolvedEnd <= resolvedStart) resolvedEnd = resolvedStart + 60;

    return {
      startMinutes: resolvedStart,
      endMinutes: resolvedEnd,
      hasTimedValues,
      arrivalStartMinutes,
      arrivalEndMinutes,
    };
  }

  function getAssignmentIds(items, primaryKeys) {
    return (Array.isArray(items) ? items : [])
      .map((item) => {
        for (const key of primaryKeys) {
          if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '') {
            return String(item[key]);
          }
        }
        return null;
      })
      .filter(Boolean);
  }

  function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
    if (![aStart, aEnd, bStart, bEnd].every((value) => Number.isFinite(value))) return false;
    return aStart < bEnd && bStart < aEnd;
  }

  function buildJobConflictMap(jobsByDateMap) {
    const conflictMap = {};

    Object.values(jobsByDateMap || {}).forEach((dayJobs) => {
      const timedJobs = dayJobs
        .map((job) => ({ job, meta: getJobTimelineMeta(job) }))
        .filter(({ meta }) => meta.hasTimedValues);

      for (let i = 0; i < timedJobs.length; i += 1) {
        const current = timedJobs[i];
        const currentCrew = new Set(getAssignmentIds(current.job?.crew_assignments, ['crew_member_id', 'user_id', 'id']));
        const currentTrucks = new Set(getAssignmentIds(current.job?.truck_assignments, ['truck_id', 'id']));

        for (let j = i + 1; j < timedJobs.length; j += 1) {
          const candidate = timedJobs[j];
          if (!intervalsOverlap(current.meta.startMinutes, current.meta.endMinutes, candidate.meta.startMinutes, candidate.meta.endMinutes)) {
            continue;
          }

          const candidateCrew = new Set(getAssignmentIds(candidate.job?.crew_assignments, ['crew_member_id', 'user_id', 'id']));
          const candidateTrucks = new Set(getAssignmentIds(candidate.job?.truck_assignments, ['truck_id', 'id']));

          const crewOverlap = [...currentCrew].some((id) => candidateCrew.has(id));
          const truckOverlap = [...currentTrucks].some((id) => candidateTrucks.has(id));

          if (!crewOverlap && !truckOverlap) continue;

          conflictMap[current.job.id] = {
            ...(conflictMap[current.job.id] || { crew: false, truck: false }),
            crew: (conflictMap[current.job.id]?.crew || false) || crewOverlap,
            truck: (conflictMap[current.job.id]?.truck || false) || truckOverlap,
          };
          conflictMap[candidate.job.id] = {
            ...(conflictMap[candidate.job.id] || { crew: false, truck: false }),
            crew: (conflictMap[candidate.job.id]?.crew || false) || crewOverlap,
            truck: (conflictMap[candidate.job.id]?.truck || false) || truckOverlap,
          };
        }
      }
    });

    return conflictMap;
  }

  const formatCalendarPill = (job) => {
    return {
      title: job.customer_name || job.name || 'Untitled Job',
      time: getJobTimeLabel(job),
      window: getArrivalWindowLabel(job),
      load: getLoadLabel(job),
    };
  };

  const openJobActions = (job, event) => {
    event?.stopPropagation?.();
    if (job.status === 'opportunity') {
      goToOpportunity(job);
      return;
    }
    setSelectedJob(job);
    setDispatchError('');
    setCrewDraft({ user_id: '', role: 'mover' });
    setTruckDraft({ truck_id: '' });
    setScheduleDraft({
      start_time: job.start_time || '',
      end_time: job.end_time || '',
      arrival_window_start: job.arrival_window_start || '',
      arrival_window_end: job.arrival_window_end || '',
    });
  };

  const closeJobActions = () => {
    if (jobActionBusy) return;
    setSelectedJob(null);
    setDispatchError('');
  };

  const goToOpportunity = (job) => {
    if (!job?.id) return;
    const realId = String(job.id).startsWith('opp-') ? job.id.replace('opp-', '') : job.id;
    const path = String(job.id).startsWith('opp-') ? getRecordDetailPath('opportunity', job) : `/jobs/${realId}`;
    navigate(path);
  };

  const openDateJobs = (dateString) => {
    if (!dateString) return;
    setSelectedCalendarDate(dateString);
  };

  const closeDateJobs = () => {
    setSelectedCalendarDate('');
  };

  const formatPrettyDate = (dateString) => {
    if (!dateString) return '';
    const raw = String(dateString).trim();
    if (!raw) return '';
    const [year, month, day] = raw.split('-').map((part) => Number(part));
    if (!year || !month || !day) return raw;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const updateJobStatus = async (status) => {
    if (!selectedJob?.id) return;
    if (!canAll([PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      showToast('You do not have permission to update jobs.', 'warning');
      return;
    }
    setJobActionBusy(true);
    setDispatchError('');
    try {
      const updated = await API.jobs.updateJob(selectedJob.id, { status });
      setJobs((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedJob(updated);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const conflicts = error?.response?.data?.conflicts;
      setDispatchError(detail || (conflicts ? JSON.stringify(conflicts) : 'Unable to update job status.'));
      console.error('Error updating job status:', error);
    } finally {
      setJobActionBusy(false);
    }
  };

  const loadDispatchLookups = async () => {
    try {
      const [crewRes, trucksRes] = await Promise.all([
        getLookupUsersPage('', 0, 100, selectedBranchId || null),
        API.jobs.getTrucks()
      ]);
      const crewRows = Array.isArray(crewRes?.results) ? crewRes.results : Array.isArray(crewRes) ? crewRes : [];
      setUsers(crewRows);
      setTrucks(Array.isArray(trucksRes) ? trucksRes : trucksRes?.results || []);
    } catch (error) {
      console.error('Error loading dispatch lookups:', error);
    }
  };

  useEffect(() => {
    if (!selectedJob?.id) return;
    loadDispatchLookups();
  }, [selectedJob?.id, selectedBranchId]);

  useEffect(() => {
    if (selectedBranchId || !userBranchId) return;
    setSelectedBranchId(userBranchId);
  }, [selectedBranchId, userBranchId]);

  const saveSchedule = async () => {
    if (!selectedJob?.id) return;
    if (!canAll([PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      showToast('You do not have permission to update jobs.', 'warning');
      return;
    }
    setJobActionBusy(true);
    setDispatchError('');
    try {
      const updated = await API.jobs.updateJob(selectedJob.id, {
        start_time: scheduleDraft.start_time || null,
        end_time: scheduleDraft.end_time || null,
        arrival_window_start: scheduleDraft.arrival_window_start || null,
        arrival_window_end: scheduleDraft.arrival_window_end || null,
      });
      setJobs((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedJob(updated);
    } catch (error) {
      const data = error?.response?.data;
      setDispatchError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to save schedule.');
    } finally {
      setJobActionBusy(false);
    }
  };

  const addCrew = async () => {
    if (!selectedJob?.id || !crewDraft.user_id) return;
    if (!canAll([PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      showToast('You do not have permission to assign crew.', 'warning');
      return;
    }
    setJobActionBusy(true);
    setDispatchError('');
    try {
      const updated = await API.jobs.assignJobCrew(selectedJob.id, { crew_member_id: Number(crewDraft.user_id), role: crewDraft.role });
      setJobs((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedJob(updated);
      setCrewDraft((prev) => ({ ...prev, user_id: '' }));
    } catch (error) {
      const data = error?.response?.data;
      setDispatchError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to assign crew.');
    } finally {
      setJobActionBusy(false);
    }
  };

  const removeCrew = async (userId, role) => {
    if (!selectedJob?.id) return;
    if (!canAll([PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      showToast('You do not have permission to update crew assignments.', 'warning');
      return;
    }
    setJobActionBusy(true);
    setDispatchError('');
    try {
      const updated = await API.jobs.unassignJobCrew(selectedJob.id, { crew_member_id: userId, role });
      setJobs((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedJob(updated);
    } catch (error) {
      const data = error?.response?.data;
      setDispatchError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to unassign crew.');
    } finally {
      setJobActionBusy(false);
    }
  };

  const addTruck = async () => {
    if (!selectedJob?.id || !truckDraft.truck_id) return;
    if (!canAll([PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      showToast('You do not have permission to assign trucks.', 'warning');
      return;
    }
    setJobActionBusy(true);
    setDispatchError('');
    try {
      const updated = await API.jobs.assignJobTruck(selectedJob.id, { truck_id: Number(truckDraft.truck_id) });
      setJobs((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedJob(updated);
      setTruckDraft({ truck_id: '' });
    } catch (error) {
      const data = error?.response?.data;
      setDispatchError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to assign truck.');
    } finally {
      setJobActionBusy(false);
    }
  };

  const removeTruck = async (truckId) => {
    if (!selectedJob?.id) return;
    if (!canAll([PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      showToast('You do not have permission to update truck assignments.', 'warning');
      return;
    }
    setJobActionBusy(true);
    setDispatchError('');
    try {
      const updated = await API.jobs.unassignJobTruck(selectedJob.id, { truck_id: truckId });
      setJobs((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedJob(updated);
    } catch (error) {
      const data = error?.response?.data;
      setDispatchError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to unassign truck.');
    } finally {
      setJobActionBusy(false);
    }
  };

  const weekTimelineStart = 6 * 60;
  const weekTimelineEnd = 22 * 60;
  const weekHourHeight = 64;
  const weekTimelineHours = Array.from(
    { length: ((weekTimelineEnd - weekTimelineStart) / 60) + 1 },
    (_, index) => weekTimelineStart + (index * 60),
  );

  const buildWeekLaneLayout = (dayJobs) => {
    const unscheduledJobs = [];
    const timedJobs = [];

    dayJobs.forEach((job) => {
      const meta = getJobTimelineMeta(job);
      if (meta.hasTimedValues) {
        timedJobs.push({ job, ...meta });
      } else {
        unscheduledJobs.push(job);
      }
    });

    timedJobs.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.endMinutes - b.endMinutes;
    });

    const laneEnds = [];
    const laidOutJobs = timedJobs.map((entry) => {
      let laneIndex = laneEnds.findIndex((endMinutes) => entry.startMinutes >= endMinutes);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(entry.endMinutes);
      } else {
        laneEnds[laneIndex] = entry.endMinutes;
      }
      return { ...entry, laneIndex };
    });

    return {
      unscheduledJobs,
      timedJobs: laidOutJobs,
      laneCount: Math.max(laneEnds.length, 1),
    };
  };

  const renderWeekView = () => {
    const days = getDaysOfWeek(currentDate);
    const todayYmd = toYmd(new Date());
    const layouts = days.map((dayDate, idx) => {
      const dateStr = toYmd(dayDate);
      const dayJobs = calendarJobsByDate[dateStr] || [];
      return {
        dayDate,
        dateStr,
        dayJobs,
        layout: buildWeekLaneLayout(dayJobs),
        weekdayLabel: weekdayLabels[idx],
      };
    });
    const timelineHeight = ((weekTimelineEnd - weekTimelineStart) / 60) * weekHourHeight;

    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-200 bg-slate-50/80 text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] text-slate-500 shrink-0">
          <span>Week timeline</span>
          <span>{layouts.reduce((sum, entry) => sum + entry.dayJobs.length, 0)} jobs in range</span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-white custom-scrollbar">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[72px_repeat(7,minmax(140px,1fr))] border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-xs">
              <div className="border-r border-slate-200 px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky left-0 z-30 bg-slate-100 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                Time
              </div>
              {layouts.map(({ dayDate, dateStr, weekdayLabel, dayJobs }) => {
                const isToday = dateStr === todayYmd;
                return (
                  <div
                    key={dateStr}
                    onClick={() => {
                      setCurrentDate(new Date(dayDate));
                      setViewMode('day');
                    }}
                    className={`border-r border-slate-200 px-3 py-2.5 transition-colors cursor-pointer group hover:bg-blue-50/50 ${isToday ? 'bg-blue-50/70' : ''}`}
                    title="Click to switch to Day View for this date"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-700' : 'text-slate-500'}`}>
                          {weekdayLabel}
                        </div>
                        <div className={`text-sm font-extrabold flex items-center gap-1.5 ${isToday ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'}`}>
                          <span>{dayDate.getDate()}</span>
                          {isToday && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-blue-600 text-white rounded font-bold uppercase tracking-wider">
                              Today
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {dayJobs.length}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-[72px_repeat(7,minmax(140px,1fr))]">
              <div className="relative border-r border-slate-200 bg-slate-50/95 sticky left-0 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                <div className="relative" style={{ height: `${timelineHeight}px` }}>
                  {weekTimelineHours.map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-slate-200 px-2"
                      style={{ top: `${index * weekHourHeight}px` }}
                    >
                      <span className="absolute -top-2 left-2 rounded bg-slate-50 px-1 text-[10px] font-bold text-slate-400">
                        {formatMinutesLabel(hour)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {layouts.map(({ dayJobs, dateStr, layout }) => {
                const unscheduledPreviewCount = Math.min(layout.unscheduledJobs.length, 3);
                const unscheduledPanelHeight = layout.unscheduledJobs.length > 0
                  ? 18 + (unscheduledPreviewCount * 32) + (layout.unscheduledJobs.length > 3 ? 24 : 0)
                  : 0;

                return (
                <div
                  key={dateStr}
                  className="relative border-r border-slate-200 bg-white overflow-hidden"
                  style={{ minHeight: `${timelineHeight + unscheduledPanelHeight}px` }}
                  onClick={() => openDateJobs(dateStr, dayJobs)}
                >
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'linear-gradient(to bottom, rgba(226,232,240,0.8) 1px, transparent 1px)',
                      backgroundSize: `100% ${weekHourHeight}px`,
                      backgroundPositionY: `${unscheduledPanelHeight}px`,
                    }}
                  />

                  {layout.unscheduledJobs.length > 0 ? (
                    <div
                      className="absolute left-0 right-0 top-0 z-10 border-b border-slate-200 bg-slate-50/90 px-2 py-2"
                      style={{ height: `${unscheduledPanelHeight}px` }}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Unscheduled</span>
                        <span>{layout.unscheduledJobs.length}</span>
                      </div>
                      <div className="space-y-1">
                      {layout.unscheduledJobs.slice(0, 3).map((job) => {
                        const hasConflict = !!conflictMap[job.id];
                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openJobActions(job, event);
                            }}
                            className={`w-full rounded-lg border px-2 py-1.5 text-left text-[10px] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getCalendarAccent(job)} ${hasConflict ? 'ring-1 ring-rose-300' : ''}`}
                          >
                            <div className="truncate font-semibold">
                              {job.customer_name || job.name || 'Untitled Job'}
                            </div>
                            <div className="truncate text-[9px] font-bold uppercase tracking-wider opacity-80">
                              {job.status}
                            </div>
                            {hasConflict ? (
                              <div className="mt-1 inline-flex rounded-full bg-rose-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-rose-700">
                                Conflict
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                        {layout.unscheduledJobs.length > 3 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-400">
                            +{layout.unscheduledJobs.length - 3} more
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div
                    className="relative"
                    style={{ paddingTop: `${unscheduledPanelHeight}px`, minHeight: `${timelineHeight}px` }}
                  >
                    {layout.timedJobs.map(({ job, startMinutes, endMinutes, laneIndex, laneCount, arrivalStartMinutes, arrivalEndMinutes }) => {
                    const hasConflict = !!conflictMap[job.id];
                    const clampedStart = Math.max(startMinutes, weekTimelineStart);
                    const clampedEnd = Math.min(endMinutes, weekTimelineEnd);
                    const top = Math.max(0, ((clampedStart - weekTimelineStart) / 60) * weekHourHeight);
                    const blockHeight = Math.max((((clampedEnd - clampedStart) / 60) * weekHourHeight), 52);
                    const laneWidth = 100 / laneCount;
                    const laneLeft = laneIndex * laneWidth;
                    const arrivalTop = arrivalStartMinutes !== null
                      ? Math.max(0, (((Math.max(arrivalStartMinutes, weekTimelineStart) - weekTimelineStart) / 60) * weekHourHeight))
                      : null;
                    const arrivalHeight = arrivalStartMinutes !== null && arrivalEndMinutes !== null
                      ? Math.max((((Math.min(arrivalEndMinutes, weekTimelineEnd) - Math.max(arrivalStartMinutes, weekTimelineStart)) / 60) * weekHourHeight), 12)
                      : null;

                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openJobActions(job, event);
                        }}
                        className={`absolute z-20 rounded-2xl border p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${getStatusColor(job.status)} ${hasConflict ? 'ring-2 ring-rose-300 shadow-rose-100' : ''}`}
                        style={{
                          top: `${top + 6}px`,
                          height: `${Math.max(blockHeight - 8, 44)}px`,
                          left: `calc(${laneLeft}% + 4px)`,
                          width: `calc(${laneWidth}% - 8px)`,
                        }}
                      >
                        {arrivalTop !== null && arrivalHeight !== null ? (
                          <div
                            className="absolute left-1 right-1 rounded-xl border border-dashed border-slate-300 bg-white/60"
                            style={{
                              top: `${Math.max(arrivalTop - top, 2)}px`,
                              height: `${Math.max(arrivalHeight, 14)}px`,
                            }}
                          />
                        ) : null}

                        <div className="relative z-10 flex h-full min-w-0 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[11px] font-extrabold leading-tight text-slate-900">
                                {job.customer_name || job.name || 'Untitled Job'}
                              </div>
                              <div className="truncate text-[9px] font-semibold text-slate-600">
                                {job.job_type || 'Moving'}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                              {job.status}
                            </span>
                          </div>
                          {hasConflict ? (
                            <div className="inline-flex w-fit rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                              Conflict
                            </div>
                          ) : null}

                          <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold text-slate-700">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5">
                              <Clock size={9} />
                              <span>{getJobTimeLabel(job)}</span>
                            </span>
                            {getLoadLabel(job) ? (
                              <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-slate-600">
                                {getLoadLabel(job)}
                              </span>
                            ) : null}
                          </div>

                          {(job.origin || job.destination) && (
                            <div className="mt-auto space-y-0.5 border-t border-white/50 pt-1 text-[9px] font-semibold text-slate-600">
                              {job.origin && (
                                <div className="truncate">
                                  O: {job.origin.split(',')[0]}
                                </div>
                              )}
                              {job.destination && (
                                <div className="truncate">
                                  D: {job.destination.split(',')[0]}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
          <div className="min-w-[680px] lg:min-w-0 h-full flex flex-col">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/95 sticky top-0 z-10 shrink-0">
              {weekdayLabels.map((day) => (
                <div key={day} className="px-2.5 sm:px-3 py-2.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div
              className="grid flex-1 grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 border-b border-slate-200"
              style={{ minHeight: '620px' }}
            >
              {monthCells.map((cell) => {
                const dayJobs = calendarJobsByDate[cell.dateKey] || [];
                const maxVisiblePills = 3;
                const visibleJobs = dayJobs.slice(0, maxVisiblePills);
                const extraCount = dayJobs.length - maxVisiblePills;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => openDateJobs(cell.dateKey)}
                    className={`group min-h-[95px] sm:min-h-[110px] lg:min-h-[125px] flex flex-col p-1.5 sm:p-2 text-left transition-colors cursor-pointer ${
                      cell.isToday
                        ? 'bg-blue-50/30 hover:bg-blue-50/50'
                        : cell.currentMonth
                        ? 'bg-white hover:bg-slate-50/90'
                        : 'bg-slate-50/40 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {/* Date Header inside cell */}
                    <div className="flex items-center justify-between gap-1 shrink-0 mb-1">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentDate(new Date(cell.date));
                          setViewMode('day');
                        }}
                        className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-xs font-bold transition hover:ring-2 hover:ring-blue-400 cursor-pointer ${
                          cell.isToday
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : cell.currentMonth
                            ? 'text-slate-800 hover:bg-slate-100 hover:text-blue-600'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title="Click to view day in Day view"
                      >
                        {cell.day}
                      </span>
                      {dayJobs.length > 0 && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-blue-700">
                          {dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}
                        </span>
                      )}
                    </div>

                    {/* Jobs Pill List */}
                    <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
                      {visibleJobs.map((job) => {
                        const pill = formatCalendarPill(job);
                        const hasConflict = !!conflictMap[job.id];
                        return (
                          <div
                            key={job.id}
                            className={`group/pill relative shrink-0 overflow-hidden rounded-md border px-1.5 py-0.5 sm:py-1 text-[10px] leading-tight shadow-2xs transition hover:shadow-xs ${getCalendarAccent(job)} ${hasConflict ? 'ring-1 ring-rose-400' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openJobActions(job, event);
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              {pill.time && (
                                <span className="shrink-0 rounded bg-white/90 px-1 text-[9px] font-mono font-bold text-slate-700">
                                  {pill.time}
                                </span>
                              )}
                              <span className="min-w-0 truncate font-semibold text-slate-900">
                                {pill.title}
                              </span>
                            </div>
                            {hasConflict && (
                              <div className="mt-0.5 inline-flex rounded bg-rose-100 px-1 text-[8px] font-bold text-rose-700">
                                Conflict
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {extraCount > 0 && (
                        <span className="mt-auto inline-flex items-center text-[9px] font-bold text-slate-500 hover:text-blue-600 pt-0.5">
                          +{extraCount} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarHeader = () => {
    const isToday = toYmd(currentDate) === toYmd(new Date());

    let headerTitle = '';
    let headerSublabel = '';

    if (viewMode === 'day') {
      headerTitle = currentDate.toLocaleDateString('default', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      headerSublabel = isToday ? 'Today' : 'Day View';
    } else if (viewMode === 'week') {
      const days = getDaysOfWeek(currentDate);
      const start = days[0];
      const end = days[6];
      const startMonth = start.toLocaleDateString('default', { month: 'short' });
      const endMonth = end.toLocaleDateString('default', { month: 'short' });
      const startDay = start.getDate();
      const endDay = end.getDate();
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();

      if (startYear !== endYear) {
        headerTitle = `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
      } else if (startMonth !== endMonth) {
        headerTitle = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
      } else {
        headerTitle = `${startMonth} ${startDay} – ${endDay}, ${startYear}`;
      }
      headerSublabel = 'Week View';
    } else {
      headerTitle = `${monthName} ${year}`;
      headerSublabel = 'Month View';
    }

    return (
      <div className="px-3 sm:px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Main Navigation Cluster */}
            <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50/90 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={prevDate}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                aria-label={`Previous ${viewMode}`}
                title={`Previous ${viewMode}`}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Today Button & Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDateMenu(!showDateMenu)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    isToday
                      ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="Calendar Navigation & Quick Change Options"
                >
                  <span>Today</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${showDateMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu when clicked */}
                {showDateMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowDateMenu(false)}
                    />
                    <div 
                      className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-3.5 text-slate-800 animate-in fade-in-50 zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                        <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-blue-600" />
                          <span>Calendar Options</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 capitalize bg-slate-100 px-2 py-0.5 rounded-md">
                          {viewMode} view
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div className="space-y-1 mb-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
                          Quick Presets
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => today()}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                              isToday ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>Today</span>
                            {isToday && <Check size={13} className="text-blue-600" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => jumpToTomorrow()}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 text-left transition cursor-pointer"
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => jumpToYesterday()}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 text-left transition cursor-pointer"
                          >
                            Yesterday
                          </button>
                          <button
                            type="button"
                            onClick={jumpToThisWeek}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                              viewMode === 'week' && isToday ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>This Week</span>
                            {viewMode === 'week' && isToday && <Check size={13} className="text-blue-600" />}
                          </button>
                          <button
                            type="button"
                            onClick={jumpToThisMonth}
                            className={`col-span-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                              viewMode === 'month' && isToday ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>This Month</span>
                            {viewMode === 'month' && isToday && <Check size={13} className="text-blue-600" />}
                          </button>
                        </div>
                      </div>

                      {/* Work in Mode Switcher within Dropdown */}
                      <div className="space-y-1 mb-3 pt-2.5 border-t border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
                          Work In Mode
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {['day', 'week', 'month'].map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                setViewMode(mode);
                                setShowDateMenu(false);
                              }}
                              className={`px-2 py-1.5 text-xs font-bold rounded-lg capitalize transition text-center cursor-pointer ${
                                viewMode === mode
                                  ? 'bg-slate-900 text-white shadow-2xs'
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              {mode} view
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Direct Date Picker */}
                      <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Jump to Specific Date
                          </span>
                        </div>
                        <input
                          type="date"
                          value={toYmd(currentDate)}
                          onChange={(e) => jumpToSpecificDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Direct native date picker trigger icon button */}
              <div className="relative">
                <input
                  ref={datePickerRef}
                  type="date"
                  value={toYmd(currentDate)}
                  onChange={(e) => jumpToSpecificDate(e.target.value)}
                  className="absolute inset-0 opacity-0 pointer-events-auto cursor-pointer w-full h-full"
                  aria-label="Pick date"
                  title="Pick specific date"
                />
                <button
                  type="button"
                  onClick={() => datePickerRef.current?.showPicker?.()}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
                  title="Pick specific date"
                >
                  <Calendar size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={nextDate}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                aria-label={`Next ${viewMode}`}
                title={`Next ${viewMode}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Return to Today Pill if currently viewing another date */}
            {!isToday && (
              <button
                type="button"
                onClick={() => today()}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold border border-blue-200/60 transition cursor-pointer"
                title="Return to Today"
              >
                <span>Jump to Today</span>
              </button>
            )}

            {/* Calendar Title with Subtitle */}
            <div className="flex flex-col ml-1">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-slate-900 leading-snug">
                {headerTitle}
              </h2>
              {headerSublabel && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {headerSublabel}
                </div>
              )}
            </div>
          </div>

          {/* Right section: Day / Week / Month View Mode Switcher with Gradient Active Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 shadow-2xs">
              {['month', 'week', 'day'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                    viewMode === mode
                      ? 'active-tab bg-gradient-to-r from-[#f5a85b] to-[#f6cfcb] text-black shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  style={viewMode === mode ? { background: 'linear-gradient(90deg, #f5a85b, #f6cfcb)', color: '#000000' } : undefined}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dateStr = toYmd(currentDate);
    const dayJobs = calendarJobsByDate[dateStr] || [];
    const scheduledJobs = dayJobs.filter((job) => job.start_time || job.end_time);
    const unscheduledJobs = dayJobs.length - scheduledJobs.length;
    const conflictJobs = dayJobs.filter((job) => conflictMap[job.id]).length;

    return (
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/30 overflow-hidden">
        {/* Left Side: Summary & Quick Stats */}
        <div className="w-full lg:w-80 p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 bg-white shrink-0 overflow-y-auto max-h-[35vh] lg:max-h-none border-b lg:border-b-0">
          <div className="flex items-center justify-between lg:block">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Daily Summary</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{formatPrettyDate(dateStr)}</p>
            </div>
            {toYmd(currentDate) === toYmd(new Date()) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 lg:hidden">
                Today
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-2 gap-2 sm:gap-2.5">
            <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Jobs</div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{dayJobs.length}</div>
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-50/70 rounded-xl border border-amber-100">
              <div className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider">Unscheduled</div>
              <div className="text-xl sm:text-2xl font-black text-amber-800 mt-0.5">{unscheduledJobs}</div>
            </div>
            <div className="p-2.5 sm:p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">Confirmed</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5">
                {dayJobs.filter(j => j.status === 'confirmed').length}
              </div>
            </div>
            <div className="p-2.5 sm:p-3 bg-blue-50/70 rounded-xl border border-blue-100">
              <div className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">Timed</div>
              <div className="text-xl sm:text-2xl font-black text-blue-800 mt-0.5">{scheduledJobs.length}</div>
            </div>
            <div className="p-2.5 sm:p-3 bg-rose-50/70 rounded-xl border border-rose-100">
              <div className="text-[10px] font-extrabold uppercase text-rose-600 tracking-wider">Conflicts</div>
              <div className="text-xl sm:text-2xl font-black text-rose-800 mt-0.5">{conflictJobs}</div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Breakdown</div>
            <div className="space-y-1.5">
              {['opportunity', 'booked', 'confirmed', 'completed', 'canceled'].map(status => {
                const count = dayJobs.filter(j => j.status === status).length;
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center justify-between text-xs">
                    <span className="capitalize font-semibold text-slate-600">{status}</span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getStatusColor(status)}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-slate-100 hidden lg:block">
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs text-blue-800 font-semibold flex gap-2">
              <Clock size={16} className="text-blue-500 shrink-0" />
              <span>Use this view to dispatch crew, assign trucks, and finalize schedules for today.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Jobs List */}
        <div className="flex-1 min-h-0 p-6 overflow-y-auto">
          {dayJobs.length > 0 ? (
            <div className="space-y-4 max-w-4xl">
              {dayJobs
                .slice()
                .sort((a, b) => String(a?.start_time || '').localeCompare(String(b?.start_time || '')))
                .map((job) => {
                  const crew = job.crew_assignments || [];
                  const trucks = job.truck_assignments || [];
                  const hasConflict = !!conflictMap[job.id];
                  return (
                    <div 
                      key={job.id}
                      className={`group bg-white rounded-3xl border p-6 hover:border-blue-300 hover:shadow-lg transition-all ${hasConflict ? 'border-rose-200 ring-1 ring-rose-300' : 'border-slate-200'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition">
                              {job.customer_name || job.name || 'Untitled Job'}
                            </h4>
                            <span className={`px-3 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(job.status)}`}>
                              {job.status}
                            </span>
                            {hasConflict ? (
                              <span className="px-3 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border-rose-200">
                                Conflict
                              </span>
                            ) : null}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-bold">
                            <span>#{job.sales_number || job.display_number || job.id}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                            <span>{job.job_type || 'Moving Job'}</span>
                            {job.distance_km && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                <span>{job.distance_km} km</span>
                              </>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                            {/* Route Info */}
                            <div className="space-y-2 text-xs">
                              <div className="flex items-start gap-2 text-slate-600">
                                <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                  <div className="font-extrabold text-slate-700">Origin</div>
                                  <div className="mt-0.5 text-slate-500 font-medium leading-relaxed">{job.origin || 'No origin address'}</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-slate-600">
                                <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                  <div className="font-extrabold text-slate-700">Destination</div>
                                  <div className="mt-0.5 text-slate-500 font-medium leading-relaxed">{job.destination || 'No destination address'}</div>
                                </div>
                              </div>
                            </div>

                            {/* Schedule & Dispatch */}
                            <div className="space-y-3">
                              <div className="flex items-start gap-2 text-xs text-slate-600">
                                <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                  <div className="font-extrabold text-slate-700">Schedule</div>
                                  <div className="mt-0.5 text-slate-500 font-extrabold">
                                    {getJobTimeLabel(job)}
                                  </div>
                                  {getArrivalWindowLabel(job) ? (
                                    <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Arrival window {getArrivalWindowLabel(job)}
                                    </div>
                                  ) : null}
                                  {!job.start_time && !job.end_time ? (
                                    <div className="mt-1 text-[10px] font-semibold text-amber-700">
                                      This job still needs a scheduled time.
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {/* Assignments summary */}
                              <div className="flex flex-wrap gap-4 text-[11px] font-bold">
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wider text-[9px]">Crew Assigned ({crew.length})</div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {crew.map(c => (
                                      <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        {c.crew_member_name} ({c.role})
                                      </span>
                                    ))}
                                    {!crew.length && <span className="text-slate-400 italic font-semibold">None</span>}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wider text-[9px]">Trucks Assigned ({trucks.length})</div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {trucks.map(t => (
                                      <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
                                        <Truck size={10} className="text-slate-400" />
                                        {t.truck_name}
                                      </span>
                                    ))}
                                    {!trucks.length && <span className="text-slate-400 italic font-semibold">None</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {getLoadLabel(job) || 'No crew or truck assigned'}
                          </span>
                          {!job.start_time && !job.end_time ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                              Missing move time
                            </span>
                          ) : null}
                        </div>

                        {/* Action buttons */}
                        <div className="flex sm:flex-col items-stretch gap-2 shrink-0 w-full sm:w-32">
                          <button
                            type="button"
                            onClick={(e) => openJobActions(job, e)}
                            className="flex-1 sm:flex-none py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold text-center transition shadow-sm"
                          >
                            Dispatch
                          </button>
                          <button
                            type="button"
                            onClick={() => goToOpportunity(job)}
                            className="flex-1 sm:flex-none py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold text-center transition"
                          >
                            Job Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
              <Calendar size={48} className="text-slate-300 mb-3" />
              <h4 className="text-base font-bold text-slate-800">No jobs scheduled for this day</h4>
              <p className="text-xs text-slate-400 font-semibold mt-1">Use the calendar navigation to check other dates.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

	  return (
	    <div className="flex-1 min-h-[calc(100vh-4.5rem)] flex flex-col bg-slate-50 overflow-hidden relative rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="sticky top-0 z-30 flex flex-col shadow-sm bg-white">
	      {/* Header */}
	      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-4 md:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Jobs Management</h1>
          <p className="text-sm text-slate-500">Track and manage your booked moves</p>
        </div>
        
	        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
	          <div className="relative flex-1 sm:flex-initial">
	            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
	            <input 
              type="text"
              placeholder="Search jobs..."
              className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all w-full md:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
	        </div>
	      </div>
        </div>

      <div className="shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Branch</div>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="">{userBranchId ? 'My branch' : 'All branches'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name || `Branch ${b.id}`}
                  </option>
                ))}
	              </select>
	            </div>

	            <div className="md:col-span-3">
	              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Job Type</div>
	              <select
	                value={selectedJobType}
	                onChange={(e) => setSelectedJobType(e.target.value)}
	                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
	              >
	                <option value="">All job types</option>
	                {jobTypeOptions.map((t) => (
	                  <option key={t} value={t}>
	                    {t}
	                  </option>
	                ))}
	              </select>
	            </div>

	            <div className="md:col-span-3">
	              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Calendar View</div>
	              <select
	                value={calendarMetric}
	                onChange={(e) => setCalendarMetric(e.target.value)}
	                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
	              >
	                {summaryOptions.map((option) => (
	                  <option key={option.value} value={option.value}>
	                    {option.label}
	                  </option>
	                ))}
	              </select>
	            </div>

	            <div className="md:col-span-3 flex md:justify-end">
	              <button
	                type="button"
	                onClick={() => {
	                  setSelectedBranchId('');
	                  setSelectedJobType('');
	                  setCalendarMetric('Booked');
	                }}
	                className="w-full md:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
	              >
	                Clear
	              </button>
	            </div>
	          </div>
	        </div>
          </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-2 sm:p-4 min-h-0 flex flex-col">
        {!loading && !jobs.length && nextJobDate ? (
          <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 flex items-center justify-between gap-3 shrink-0">
            <div>
              No jobs scheduled in this range. Next job is on <span className="font-bold">{nextJobDate}</span>.
            </div>
            <button
              type="button"
              onClick={() => {
                const [y, m, d] = String(nextJobDate).split('-').map((v) => Number(v));
                if (!y || !m) return;
                setCurrentDate(new Date(y, m - 1, d || 1));
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              Jump to date
            </button>
          </div>
        ) : null}

        <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {renderCalendarHeader()}
          {loading ? (
            <div className="h-full min-h-0 w-full flex flex-col items-center justify-center py-24 flex-1">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-slate-500 text-sm font-medium">Loading jobs...</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
            </div>
          )}
        </div>
      </div>

	      {selectedCalendarDate ? (
	        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={closeDateJobs}>
	          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
	            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
	              <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{formatPrettyDate(selectedCalendarDate)}</h3>
                    <p className="text-sm font-semibold text-slate-500">
                      {selectedDateJobs.length ? `${selectedDateJobs.length} ${selectedDateJobs.length === 1 ? 'job' : 'jobs'} scheduled` : 'No jobs scheduled'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const [y, m, d] = String(selectedCalendarDate).split('-').map(Number);
                      if (y && m && d) {
                        setCurrentDate(new Date(y, m - 1, d));
                        setViewMode('day');
                      }
                      closeDateJobs();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Open this date in Day View"
                  >
                    <Calendar size={13} />
                    <span>Open Day View</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeDateJobs}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
	            </div>

	            <div className="max-h-[70vh] overflow-auto px-6 py-6 custom-scrollbar">
	              {selectedDateJobs.length ? (
	                <div className="space-y-3">
	                  {selectedDateJobs
	                    .slice()
	                    .sort((a, b) => String(a?.start_time || '').localeCompare(String(b?.start_time || '')))
	                    .map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => {
                          closeDateJobs();
                          goToOpportunity(job);
	                        }}
	                        className="w-full group text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:bg-blue-50/30 transition-all shadow-sm"
	                      >
	                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
	                          <div className="min-w-0 space-y-1">
	                            <div className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition">
	                              {job.customer_name || job.name || 'Untitled Job'}
	                            </div>
	                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <span>#{job.sales_number || job.display_number || job.id}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span>{job.job_type || 'Moving Job'}</span>
                              </div>
                              <div className="flex flex-col gap-1.5 mt-3">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <MapPin size={14} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{job.origin || 'No origin'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <MapPin size={14} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{job.destination || 'No destination'}</span>
                                </div>
                              </div>
	                          </div>
                          <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
                            {job.start_time || job.end_time ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                                  <Clock size={14} />
                                  <span>{getJobTimeLabel(job)}</span>
                                </div>
                            ) : null}
	                            <span className={`px-3 py-1 rounded-full border text-[11px] font-extrabold uppercase tracking-wider ${getStatusColor(job.status)}`}>
	                              {job.status || 'unknown'}
	                            </span>
	                          </div>
	                        </div>
	                      </button>
	                    ))}
	                </div>
	              ) : (
	                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Calendar size={40} className="mx-auto mb-3 text-slate-300" />
	                  <p className="text-sm font-bold text-slate-400 italic">Nothing scheduled for this day.</p>
	                </div>
	              )}
	            </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={closeDateJobs}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
	          </div>
	        </div>
	      ) : null}

	      {selectedJob ? (
	        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={closeJobActions}>
	          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
	            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Job #{selectedJob.sub_job_number || selectedJob.display_number || selectedJob.sales_number || selectedJob.id}
                </h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">
                  {selectedJob.customer_name || selectedJob.name || 'Customer'} • {selectedJob.move_date || 'No move date'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeJobActions}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Update Status</div>
                <div className="flex flex-wrap gap-2">
                  {['booked', 'confirmed', 'completed', 'canceled'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={jobActionBusy}
                      onClick={() => updateJobStatus(s)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition ${
                        selectedJob.status === s ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {dispatchError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {dispatchError}
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Schedule</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase px-1">Start</label>
                    <input
                      type="time"
                      value={scheduleDraft.start_time}
                      onChange={(e) => setScheduleDraft((p) => ({ ...p, start_time: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase px-1">End</label>
                    <input
                      type="time"
                      value={scheduleDraft.end_time}
                      onChange={(e) => setScheduleDraft((p) => ({ ...p, end_time: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={jobActionBusy}
                  onClick={saveSchedule}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Save Schedule
                </button>
              </div>

              {/* Crew Assignment */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Crew Assignment</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {(selectedJob.crew_assignments || []).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 uppercase shrink-0">
                          {(a.crew_member_name || a.crew_member_email || '?').charAt(0)}
                        </div>
                        <span className="truncate font-semibold text-slate-700">{a.crew_member_name || a.crew_member_email}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-500 font-medium">{a.role}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCrew(a.crew_member_id, a.role)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {!(selectedJob.crew_assignments || []).length && (
                    <div className="text-center py-4 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-medium italic">No crew assigned</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={crewDraft.user_id}
                    onChange={(e) => setCrewDraft((p) => ({ ...p, user_id: e.target.value }))}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-medium"
                  >
                    <option value="">Select Crew</option>
                    {users.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {(u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || `Crew #${u.id}`).trim()}
                      </option>
                    ))}
                  </select>
                  <select
                    value={crewDraft.role}
                    onChange={(e) => setCrewDraft((p) => ({ ...p, role: e.target.value }))}
                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-medium"
                  >
                    <option value="dispatcher">dispatcher</option>
                    <option value="driver">driver</option>
                    <option value="mover">mover</option>
                  </select>
                  <button
                    type="button"
                    disabled={jobActionBusy || !crewDraft.user_id}
                    onClick={addCrew}
                    className="px-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-60 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Truck Assignment */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Truck Assignment</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {(selectedJob.truck_assignments || []).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                      <div className="min-w-0 flex items-center gap-2 text-slate-700">
                        <Truck size={12} className="text-slate-400" />
                        <span className="truncate font-semibold">{a.truck_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTruck(a.truck_id)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {!(selectedJob.truck_assignments || []).length && (
                    <div className="text-center py-4 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-medium italic">No trucks assigned</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={truckDraft.truck_id}
                    onChange={(e) => setTruckDraft({ truck_id: e.target.value })}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-medium"
                  >
                    <option value="">Select Truck</option>
                    {trucks.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={jobActionBusy || !truckDraft.truck_id}
                    onClick={addTruck}
                    className="px-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-60 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => goToOpportunity(selectedJob)}
                  className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition shadow-md shadow-blue-100"
                >
                  Open Full Detail
                </button>
                <button
                  type="button"
                  disabled={jobActionBusy}
                  onClick={() => updateJobStatus('confirmed')}
                  className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition shadow-md shadow-emerald-100"
                >
                  Confirm Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};
export default Jobs;
