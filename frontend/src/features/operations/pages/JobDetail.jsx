import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Copy } from 'lucide-react';
import { getRecordDetailPath } from '../../crm/utils/recordRoutes';

import API from '../../../services/api';
import FilesPanel from '../../files/components/FilesPanel';
import { 
  Icon, 
  Pill, 
  StatusDot, 
  PrimaryBtn, 
  GhostBtn, 
  StickyHeader 
} from '../../../shared/ui/RedesignAtoms';

const formatTime = (value) => (value ? String(value).slice(0, 5) : '');

const getRoleColor = (role) => {
  switch (role) {
    case 'driver': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'dispatcher': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'mover': return 'bg-teal-50 text-teal-700 border-teal-200';
    default: return 'bg-slate-50 text-slate-600';
  }
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [accounting, setAccounting] = useState(null);
  const [moverSizes, setMoverSizes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('schedule'); // schedule | files
  const [activeNotesTab, setActiveNotesTab] = useState('crew'); // crew | customer | internal
  const [copiedText, setCopiedText] = useState('');

  const [schedule, setSchedule] = useState({
    start_time: '',
    end_time: '',
    arrival_window_start: '',
    arrival_window_end: '',
  });
  const [crewMembers, setCrewMembers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [crewDraft, setCrewDraft] = useState({ user_id: '', role: 'mover' });
  const [truckDraft, setTruckDraft] = useState({ truck_id: '' });

  const jobId = Number(id);

  useEffect(() => {
    if (job) {
      const name = job.customer_name || job.name || 'Client';
      const number = job.sales_number || job.id;
      document.title = `Job #${number} - ${name} - KargoFlow CRM`;
    } else {
      document.title = 'Job Details - KargoFlow CRM';
    }
  }, [job]);

  const load = async () => {
    if (!jobId) return;
    setLoading(true);
    setError('');
    try {
      const [jobRes, crewRes, trucksRes] = await Promise.all([
        API.jobs.getJob(jobId),
        API.crew.getCrewMembers({ is_active: true }),
        API.jobs.getTrucks(),
      ]);
      setJob(jobRes);
      setSchedule({
        start_time: formatTime(jobRes.start_time),
        end_time: formatTime(jobRes.end_time),
        arrival_window_start: formatTime(jobRes.arrival_window_start),
        arrival_window_end: formatTime(jobRes.arrival_window_end),
      });
      const crewRows = Array.isArray(crewRes?.results) ? crewRes.results : Array.isArray(crewRes) ? crewRes : [];
      setCrewMembers(crewRows);
      setTrucks(Array.isArray(trucksRes) ? trucksRes : trucksRes?.results || []);

      // Fetch opportunity details
      if (jobRes.opportunity_id) {
        try {
          const oppRes = await API.sales.getOpportunity(jobRes.opportunity_id);
          setOpportunity(oppRes);
        } catch (e) {
          console.error("Failed to load opportunity info:", e);
        }
      }

      // Fetch accounting details
      try {
        const accRes = await API.jobs.getJobAccountingSummary(jobId);
        setAccounting(accRes);
      } catch (e) {
        console.error("Failed to load accounting info:", e);
      }

      // Fetch mover sizes list
      try {
        const sizesRes = await API.leads.getMoverSizes();
        const sizesRows = Array.isArray(sizesRes?.results) ? sizesRes.results : (Array.isArray(sizesRes) ? sizesRes : []);
        setMoverSizes(sizesRows);
      } catch (e) {
        console.error("Failed to load mover sizes list:", e);
      }

    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load job.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [jobId]);

  const crew = useMemo(() => job?.crew_assignments || [], [job]);
  const assignedTrucks = useMemo(() => job?.truck_assignments || [], [job]);

  const saveSchedule = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await API.jobs.updateJob(jobId, {
        start_time: schedule.start_time || null,
        end_time: schedule.end_time || null,
        arrival_window_start: schedule.arrival_window_start || null,
        arrival_window_end: schedule.arrival_window_end || null,
      });
      setJob(updated);
      
      // Refresh accounting after schedule update
      try {
        const accRes = await API.jobs.getJobAccountingSummary(jobId);
        setAccounting(accRes);
      } catch (e) {}
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to save schedule.');
    } finally {
      setBusy(false);
    }
  };

  const addCrew = async () => {
    if (!crewDraft.user_id) return;
    setBusy(true);
    setError('');
    try {
      const updated = await API.jobs.assignJobCrew(jobId, { crew_member_id: Number(crewDraft.user_id), role: crewDraft.role });
      setJob(updated);
      setCrewDraft((p) => ({ ...p, user_id: '' }));
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to assign crew.');
    } finally {
      setBusy(false);
    }
  };

  const removeCrew = async (userId, role) => {
    setBusy(true);
    setError('');
    try {
      const updated = await API.jobs.unassignJobCrew(jobId, { crew_member_id: userId, role });
      setJob(updated);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to unassign crew.');
    } finally {
      setBusy(false);
    }
  };

  const addTruck = async () => {
    if (!truckDraft.truck_id) return;
    setBusy(true);
    setError('');
    try {
      const updated = await API.jobs.assignJobTruck(jobId, { truck_id: Number(truckDraft.truck_id) });
      setJob(updated);
      setTruckDraft({ truck_id: '' });
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to assign truck.');
    } finally {
      setBusy(false);
    }
  };

  const removeTruck = async (truckId) => {
    setBusy(true);
    setError('');
    try {
      const updated = await API.jobs.unassignJobTruck(jobId, { truck_id: truckId });
      setJob(updated);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to unassign truck.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDispatch = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await API.jobs.updateJob(jobId, { status: 'confirmed', ...schedule });
      setJob(updated);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || (data?.conflicts ? JSON.stringify(data.conflicts) : Object.values(data || {}).flat().join(' ')) || 'Unable to confirm dispatch.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Convert time string (HH:MM) to decimal hour (e.g. "08:30" -> 8.5)
  const timeToDecimal = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h + (m / 60);
  };

  // Find the exact mover size name
  const moverSizeName = useMemo(() => {
    if (!opportunity || !moverSizes.length) return '';
    const size = moverSizes.find(s => s.id === opportunity.mover_size);
    return size ? size.name : '';
  }, [opportunity, moverSizes]);

  // Calculate readiness score
  const readinessStats = useMemo(() => {
    const checks = [
      { id: 'booked', label: 'Job Booked', checked: true },
      { id: 'times', label: 'Move hours configured', checked: !!schedule.start_time },
      { id: 'crew', label: 'Crew allocated', checked: crew.length > 0, info: `${crew.length} assigned` },
      { id: 'truck', label: 'Truck allocated', checked: assignedTrucks.length > 0, info: `${assignedTrucks.length} assigned` },
      { id: 'dispatched', label: 'Dispatch Confirmed', checked: job?.status === 'confirmed' || job?.status === 'completed' }
    ];
    const completed = checks.filter(c => c.checked).length;
    const percentage = Math.round((completed / checks.length) * 100);
    return { checks, completed, total: checks.length, percentage };
  }, [schedule, crew, assignedTrucks, job]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center bg-slate-50/50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand mx-auto" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Job Details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center text-slate-600 bg-slate-50/50">
        <div className="text-center p-8 bg-white border border-slate-200 rounded-3xl shadow-sm max-w-sm">
          <Icon name="info" className="mx-auto mb-4 text-slate-300 w-11 h-11" />
          <p className="font-semibold text-slate-800">{error || 'Job not found.'}</p>
          <GhostBtn onClick={() => navigate('/jobs')} className="mt-4" icon="arrow-left">
            Back to Jobs
          </GhostBtn>
        </div>
      </div>
    );
  }

  const headerActions = [
    {
      label: 'Open Opportunity',
      onClick: () => navigate(getRecordDetailPath('opportunity', job)),
      icon: 'external-link',
      type: 'ghost',
    },
    {
      label: job.status === 'confirmed' || job.status === 'completed' ? 'Dispatch Active' : 'Confirm Dispatch',
      onClick: confirmDispatch,
      icon: 'check-circle-2',
      type: 'primary',
      disabled: busy || job.status === 'confirmed' || job.status === 'completed',
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <StickyHeader 
        title={job.customer_name || job.name || 'Client Name'}
        subtitle="Operations / Jobs"
        status={job.status}
        statusTone={
          job.status === 'confirmed' ? 'green' : 
          job.status === 'completed' ? 'slate' : 
          job.status === 'canceled' ? 'rose' : 'blue'
        }
        id={job.sales_number || job.id}
        onBack={() => navigate('/jobs')}
        actions={headerActions}
        sticky={false}
        transparent={true}
      />

      <main className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-6 space-y-6">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
            <Icon name="alert-circle" className="shrink-0 mt-0.5 w-[18px] h-[18px]" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Workspace Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`group relative inline-flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'active-tab bg-gradient-to-r from-[#f5a85b] to-[#f6cfcb] text-black shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              style={activeTab === 'schedule' ? { background: 'linear-gradient(90deg, #f5a85b, #f6cfcb)', color: '#000000' } : undefined}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-white/40 text-black'
                  : 'bg-slate-200/70 text-slate-500 group-hover:bg-slate-300/70 group-hover:text-slate-700'
              }`}>
                <Icon name="calendar-days" className="w-3.5 h-3.5 text-black" />
              </span>
              <span className={activeTab === 'schedule' ? 'text-black' : ''}>Schedule &amp; Dispatch</span>
              {activeTab === 'schedule' && (
                <span className="w-1.5 h-1.5 rounded-full bg-black/60" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`group relative inline-flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                activeTab === 'files'
                  ? 'active-tab bg-gradient-to-r from-[#f5a85b] to-[#f6cfcb] text-black shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              style={activeTab === 'files' ? { background: 'linear-gradient(90deg, #f5a85b, #f6cfcb)', color: '#000000' } : undefined}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                activeTab === 'files'
                  ? 'bg-white/40 text-black'
                  : 'bg-slate-200/70 text-slate-500 group-hover:bg-slate-300/70 group-hover:text-slate-700'
              }`}>
                <Icon name="file-text" className="w-3.5 h-3.5 text-black" />
              </span>
              <span className={activeTab === 'files' ? 'text-black' : ''}>Files &amp; Photos</span>
              {activeTab === 'files' && (
                <span className="w-1.5 h-1.5 rounded-full bg-black/60" />
              )}
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-3 pr-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="capitalize font-semibold text-slate-700">{job.status || 'Active'}</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[11px] text-slate-400">Ref #{job.sales_number || job.id}</span>
          </div>
        </div>

        {activeTab === 'schedule' ? (
          <div className="space-y-6">
            {/* Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Date */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Move Date</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon name="calendar-days" className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-base font-extrabold tracking-tight text-slate-900">{job.move_date || 'Unset'}</span>
                </div>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Scheduled Date</p>
              </div>

              {/* Move Type */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Move Type</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon name="compass" className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-base font-extrabold tracking-tight text-slate-900">{job.job_type || 'Local Move'}</span>
                </div>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Service Category</p>
              </div>

              {/* Move Size */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Move Size</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon name="building" className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 truncate max-w-full">
                    {moverSizeName || (opportunity?.bedrooms ? `${opportunity.bedrooms} Bedrooms` : 'N/A')}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Inventory Volume</p>
              </div>

              {/* Transit */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transit</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon name="navigation" className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-slate-900">
                    {job.distance_km !== null && job.distance_km !== undefined ? `${job.distance_km}` : 'Local'}
                  </span>
                  {job.distance_km !== null && <span className="text-xs font-semibold text-slate-400">km</span>}
                </div>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Odometer Distance</p>
              </div>

              {/* Operational Branch */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Branch</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon name="map-pin" className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-base font-extrabold tracking-tight text-slate-900">{job.branch_name || 'Main Branch'}</span>
                </div>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Operational Unit</p>
              </div>
            </div>

            {/* Visual Workflow Steps */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="grid grid-cols-4 gap-2 relative">
                {/* Connector Line */}
                <div className="absolute top-4 left-[12.5%] right-[12.5%] h-1 bg-slate-100 z-0 rounded-full">
                  <div 
                    className="h-full bg-brand rounded-full transition-all duration-500"
                    style={{
                      width: job.status === 'completed' ? '100%' 
                             : job.status === 'confirmed' ? '66%' 
                             : (schedule.start_time && crew.length > 0) ? '33%' : '0%'
                    }}
                  ></div>
                </div>

                {/* Steps */}
                {[
                  { label: 'Booked', active: true, desc: 'Opportunity won' },
                  { label: 'Scheduled', active: !!schedule.start_time && crew.length > 0 && assignedTrucks.length > 0, desc: 'Resources assigned' },
                  { label: 'Dispatched', active: job.status === 'confirmed' || job.status === 'completed', desc: 'Crew confirmed' },
                  { label: 'Completed', active: job.status === 'completed', desc: 'Job finalized' }
                ].map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center z-10">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-4 text-xs font-black shadow-sm transition-all duration-300 ${
                      step.active 
                        ? 'bg-brand text-white border-white ring-2 ring-brand/20' 
                        : 'bg-white text-slate-400 border-slate-100'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider mt-2.5 ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 hidden sm:block">
                      {step.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content columns */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Main Board Column */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Route & Map Card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="navigation" className="text-slate-400 shrink-0 w-4 h-4" />
                      <h2 className="font-extrabold text-sm text-slate-800">Route &amp; Map Coordinates</h2>
                    </div>
                    {job.origin && job.destination && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(job.origin)}&destination=${encodeURIComponent(job.destination)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                      >
                        <Icon name="compass" className="w-3.5 h-3.5" />
                        Open Google Maps
                      </a>
                    )}
                  </div>
                  <div className="p-6 space-y-6">
                    {/* SVG Map Widget */}
                    {job.origin && job.destination ? (
                      <div className="relative h-44 bg-slate-950 rounded-xl overflow-hidden border border-slate-950/20 flex items-center justify-center">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        
                        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M 120,110 C 220,40 280,150 380,65"
                            fill="none"
                            stroke="url(#route-grad)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray="6, 6"
                            className="animate-[dash_8s_linear_infinite]"
                          />
                          <defs>
                            <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                          </defs>
                        </svg>

                        {/* Origin Pin */}
                        <div className="absolute left-[115px] top-[95px] flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-emerald-500 border-3 border-slate-950 shadow-md flex items-center justify-center relative">
                            <div className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping"></div>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 mt-1 bg-slate-950/80 px-1.5 py-0.5 rounded border border-emerald-950">A: Origin</span>
                        </div>

                        {/* Destination Pin */}
                        <div className="absolute left-[375px] top-[50px] flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-indigo-500 border-3 border-slate-950 shadow-md flex items-center justify-center relative">
                            <div className="absolute -inset-1 rounded-full bg-indigo-500/30 animate-pulse"></div>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 mt-1 bg-slate-950/80 px-1.5 py-0.5 rounded border border-indigo-950">B: Destination</span>
                        </div>

                        {/* HUD overlay info */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/95 border border-slate-800/60 rounded-xl px-3 py-2 backdrop-blur-md">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Icon name="compass" className="text-brand w-3.5 h-3.5" />
                            <span>Visual Transit Route Loaded</span>
                          </div>
                          <div className="font-bold text-white">
                            {job.distance_km !== null ? `${job.distance_km} km transit` : 'Local movement'}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Origin */}
                      <div className="relative pl-10 py-3 border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                        <div className="absolute left-4 top-5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-md ring-2 ring-emerald-100"></div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-1">Origin Address</div>
                        <p className="text-xs font-bold text-slate-800 leading-normal">
                          {job.origin || 'No origin address specified'}
                        </p>
                      </div>

                      {/* Destination */}
                      <div className="relative pl-10 py-3 border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                        <div className="absolute left-4 top-5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-md ring-2 ring-indigo-100"></div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1">Destination Address</div>
                        <p className="text-xs font-bold text-slate-800 leading-normal">
                          {job.destination || 'No destination address specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Move Schedule Settings */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="clock" className="text-slate-400 w-4 h-4" />
                      <h2 className="font-extrabold text-sm text-slate-800">Move Schedule Settings</h2>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Working Hours */}
                      <div className="space-y-4">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100">Scheduled Hours</div>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="block space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Start Time</span>
                            <input 
                              type="time" 
                              value={schedule.start_time} 
                              onChange={(e) => setSchedule((p) => ({ ...p, start_time: e.target.value }))} 
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition outline-none text-slate-900" 
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">End Time</span>
                            <input 
                              type="time" 
                              value={schedule.end_time} 
                              onChange={(e) => setSchedule((p) => ({ ...p, end_time: e.target.value }))} 
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition outline-none text-slate-900" 
                            />
                          </label>
                        </div>
                      </div>

                      {/* Arrival Window */}
                      <div className="space-y-4">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100">Arrival Window</div>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="block space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">From</span>
                            <input 
                              type="time" 
                              value={schedule.arrival_window_start} 
                              onChange={(e) => setSchedule((p) => ({ ...p, arrival_window_start: e.target.value }))} 
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition outline-none text-slate-900" 
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">To</span>
                            <input 
                              type="time" 
                              value={schedule.arrival_window_end} 
                              onChange={(e) => setSchedule((p) => ({ ...p, arrival_window_end: e.target.value }))} 
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition outline-none text-slate-900" 
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Schedule timeline visualizer */}
                    {schedule.start_time && schedule.end_time && (
                      <div className="space-y-2 border-t border-slate-100 pt-6">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visual Time allocation (6 AM - 8 PM)</span>
                        <div className="relative h-7 bg-slate-100 rounded-xl overflow-hidden mt-1 border border-slate-200">
                          {/* Hours markers */}
                          {[6, 8, 10, 12, 14, 16, 18, 20].map((hour) => {
                            const pct = ((hour - 6) / 14) * 100;
                            return (
                              <div 
                                key={hour} 
                                style={{ left: `${pct}%` }} 
                                className="absolute top-0 bottom-0 border-l border-slate-200/60 z-10 flex flex-col justify-end pb-0.5 pl-1 text-[8px] font-black text-slate-400"
                              >
                                {hour > 12 ? `${hour-12}P` : hour === 12 ? '12P' : `${hour}A`}
                              </div>
                            );
                          })}

                          {/* Work hours block */}
                          {(() => {
                            const startDec = timeToDecimal(schedule.start_time);
                            const endDec = timeToDecimal(schedule.end_time);
                            if (startDec !== null && endDec !== null && endDec > startDec) {
                              const left = Math.max(0, ((startDec - 6) / 14) * 100);
                              const width = Math.min(100 - left, ((endDec - startDec) / 14) * 100);
                              return (
                                <div 
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                  className="absolute top-0 bottom-0 bg-gradient-to-r from-brand/15 to-indigo-500/15 border-l-2 border-r-2 border-brand flex items-center justify-center text-[9px] font-extrabold text-brand tracking-wider uppercase z-20"
                                >
                                  Move duration
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Arrival window block overlay */}
                          {(() => {
                            const arrStartDec = timeToDecimal(schedule.arrival_window_start);
                            const arrEndDec = timeToDecimal(schedule.arrival_window_end);
                            if (arrStartDec !== null && arrEndDec !== null && arrEndDec > arrStartDec) {
                              const left = Math.max(0, ((arrStartDec - 6) / 14) * 100);
                              const width = Math.min(100 - left, ((arrEndDec - arrStartDec) / 14) * 100);
                              return (
                                <div 
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                  className="absolute top-0 bottom-0 bg-emerald-500/10 border-l border-r border-emerald-500/50 flex items-center justify-center text-[9px] font-extrabold text-emerald-800 tracking-wider uppercase z-30"
                                >
                                  Arrival window
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <PrimaryBtn 
                        onClick={saveSchedule} 
                        loading={busy}
                        className="w-full sm:w-auto"
                      >
                        Save Schedule Times
                      </PrimaryBtn>
                    </div>
                  </div>
                </div>

                {/* Instructions & Dispatch Log */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center gap-2">
                    <Icon name="file-text" className="text-slate-400 w-4 h-4" />
                    <h2 className="font-extrabold text-sm text-slate-800">Job Instructions &amp; Dispatch Log</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="inline-flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
                      {[
                        { id: 'crew', label: 'Crew Instructions' },
                        { id: 'customer', label: 'Customer Notes' },
                        { id: 'internal', label: 'Internal Office Notes' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveNotesTab(tab.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            activeNotesTab === tab.id
                              ? 'active-tab bg-gradient-to-r from-[#f5a85b] to-[#f6cfcb] text-black shadow-sm font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                          style={activeNotesTab === tab.id ? { background: 'linear-gradient(90deg, #f5a85b, #f6cfcb)', color: '#000000' } : undefined}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 text-sm leading-relaxed text-slate-700 min-h-[100px] whitespace-pre-line">
                      {activeNotesTab === 'crew' && (opportunity?.notes_crew || 'No custom crew notes configured for this job.')}
                      {activeNotesTab === 'customer' && (opportunity?.notes_customer || 'No customer notes captured.')}
                      {activeNotesTab === 'internal' && (opportunity?.notes_internal || 'No internal office notes.')}
                    </div>
                  </div>
                </div>

              </div>

              {/* Sidebar Column */}
              <div className="space-y-6">

                {/* Dispatch Validation */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center gap-2">
                    <Icon name="activity" className="text-slate-400 shrink-0 w-4 h-4" />
                    <h2 className="font-extrabold text-sm text-slate-800">Dispatch Validation</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Readiness Score Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span>Validation Readiness</span>
                        <span className="text-brand font-black">{readinessStats.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          style={{ width: `${readinessStats.percentage}%` }}
                          className={`h-full transition-all duration-500 ${
                            readinessStats.percentage === 100 
                              ? 'bg-emerald-500' 
                              : readinessStats.percentage >= 60 ? 'bg-brand' : 'bg-amber-500'
                          }`}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {readinessStats.checks.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-50 bg-slate-50/30 text-xs">
                          <div className="flex items-center gap-3">
                            <div className={`p-1 rounded-full ${item.checked ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {item.checked ? <Icon name="check-circle-2" className="w-3.5 h-3.5" /> : <Icon name="x" className="w-3.5 h-3.5" />}
                            </div>
                            <span className={`font-bold ${item.checked ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
                          </div>
                          {item.info && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.checked ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                              {item.info}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Customer & Contact Info */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center gap-2">
                    <Icon name="user-check" className="text-slate-400 shrink-0 w-4 h-4" />
                    <h2 className="font-extrabold text-sm text-slate-800">Customer &amp; Contact Info</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand to-indigo-500 border border-indigo-400/20 flex items-center justify-center text-sm font-black text-white uppercase shrink-0 shadow-sm">
                        {(job.customer_name || 'C').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900 leading-snug">{job.customer_name}</h3>
                        <Pill tone="blue" className="mt-1">
                          {opportunity?.customer_details?.type || 'Residential'}
                        </Pill>
                      </div>
                    </div>
                    
                    <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4 relative">
                      {copiedText && (
                        <div className="absolute top-1 right-0 px-2 py-1 bg-slate-800 text-white rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                          Copied {copiedText}!
                        </div>
                      )}

                      {/* Phone */}
                      {opportunity?.customer_details?.primary_phone && (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <Icon name="phone" className="text-slate-400 shrink-0 w-3.5 h-3.5" />
                            <a href={`tel:${opportunity.customer_details.primary_phone}`} className="font-bold text-slate-800 hover:text-brand hover:underline">
                              {opportunity.customer_details.primary_phone}
                            </a>
                          </div>
                          <button
                            onClick={() => handleCopy(opportunity.customer_details.primary_phone, 'phone')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition opacity-0 group-hover:opacity-100"
                            title="Copy phone"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}

                      {/* Alternate Phone */}
                      {opportunity?.customer_details?.alternate_phone && (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <Icon name="phone" className="text-slate-400 shrink-0 w-3.5 h-3.5" />
                            <span className="font-bold text-slate-800">
                              {opportunity.customer_details.alternate_phone} (Alt)
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(opportunity.customer_details.alternate_phone, 'alternate phone')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition opacity-0 group-hover:opacity-100"
                            title="Copy alternate phone"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}

                      {/* Email */}
                      {opportunity?.customer_details?.email && (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon name="mail" className="text-slate-400 shrink-0 w-3.5 h-3.5" />
                            <a href={`mailto:${opportunity.customer_details.email}`} className="truncate font-bold text-slate-800 hover:text-brand hover:underline">
                              {opportunity.customer_details.email}
                            </a>
                          </div>
                          <button
                            onClick={() => handleCopy(opportunity.customer_details.email, 'email')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition opacity-0 group-hover:opacity-100 shrink-0"
                            title="Copy email"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}

                      {/* Referral */}
                      {opportunity?.referral_source_details && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100/50">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Referral:</span>
                          <span className="font-bold text-slate-800">{opportunity.referral_source_details.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                {accounting && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="dollar-sign" className="text-slate-400 shrink-0 w-4 h-4" />
                        <h2 className="font-extrabold text-sm text-slate-800">Job Financials</h2>
                      </div>
                      <button
                        onClick={() => navigate(`${getRecordDetailPath('opportunity', job)}?tab=Accounting`)}
                        className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5"
                      >
                        Manage
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      {(() => {
                        const estimatedTotal = accounting.estimate?.grand_total;
                        const invoicedTotal = accounting.invoice?.total;
                        const paymentsCollected = accounting.payments?.total_paid;
                        const balanceDue = accounting.payments?.balance_due;
                        const hasEstimatedTotal = estimatedTotal !== null && estimatedTotal !== undefined;
                        const hasInvoicedTotal = invoicedTotal !== null && invoicedTotal !== undefined;
                        const hasPaymentsCollected = paymentsCollected !== null && paymentsCollected !== undefined;
                        const hasBalanceDue = balanceDue !== null && balanceDue !== undefined;
                        return (
                          <>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                          <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Estimated Total</div>
                          <div className="text-base font-extrabold text-slate-800 mt-1">
                            {hasEstimatedTotal
                              ? `$${parseFloat(accounting.estimate.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}`
                              : '$0.00'}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                          <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Invoiced Total</div>
                          <div className="text-base font-extrabold text-slate-800 mt-1">
                            {hasInvoicedTotal
                              ? `$${parseFloat(accounting.invoice.total).toLocaleString(undefined, {minimumFractionDigits: 2})}`
                              : '$0.00'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500">Payments Collected</span>
                          <span className="font-bold text-slate-800">
                            {hasPaymentsCollected
                              ? `$${parseFloat(accounting.payments.total_paid).toLocaleString(undefined, {minimumFractionDigits: 2})}`
                              : '$0.00'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100/50 pt-2">
                          <span className="font-semibold text-slate-500">Balance Due</span>
                          <span className={`font-black text-sm ${parseFloat(balanceDue ?? '0') > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {hasBalanceDue
                              ? `$${parseFloat(accounting.payments.balance_due).toLocaleString(undefined, {minimumFractionDigits: 2})}`
                              : '$0.00'}
                          </span>
                        </div>
                      </div>

                      {parseFloat(balanceDue ?? '0') > 0 ? (
                        <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl text-[10px] text-rose-800 font-semibold flex items-start gap-2 leading-relaxed">
                          <Icon name="info" className="text-rose-500 mt-0.5 shrink-0 w-3.5 h-3.5" />
                          <span>Outstanding balance requires settlement. Invoice is currently in {accounting.invoice?.status || 'draft'} status.</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-xl text-[10px] text-emerald-800 font-semibold flex items-start gap-2 leading-relaxed">
                          <Icon name="check-circle-2" className="text-emerald-600 mt-0.5 shrink-0 w-3.5 h-3.5" />
                          <span>This job has been fully settled.</span>
                        </div>
                      )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Crew Assignment */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center gap-2">
                    <Icon name="users" className="text-slate-400 w-4 h-4" />
                    <h2 className="font-extrabold text-sm text-slate-800">Crew Assignment</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="space-y-2">
                      {crew.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/20 group">
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-black text-slate-700 uppercase shrink-0">
                              {(a.crew_member_name || a.crew_member_email || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">{a.crew_member_name || a.crew_member_email}</div>
                              <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border mt-0.5 ${getRoleColor(a.role)}`}>
                                {a.role}
                              </span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            disabled={busy} 
                            onClick={() => removeCrew(a.crew_member_id, a.role)} 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                            title="Remove crew member"
                          >
                            <Icon name="trash-2" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {!crew.length && (
                        <div className="py-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                          <p className="text-xs font-bold text-slate-400 italic">No crew assigned yet</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={crewDraft.user_id} 
                          onChange={(e) => setCrewDraft((p) => ({ ...p, user_id: e.target.value }))} 
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 text-slate-800"
                        >
                          <option value="">Select Crew</option>
                          {crewMembers.map((u) => (
                            <option key={u.id} value={String(u.id)}>
                              {(u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || `Crew #${u.id}`).trim()}
                            </option>
                          ))}
                        </select>
                        <select 
                          value={crewDraft.role} 
                          onChange={(e) => setCrewDraft((p) => ({ ...p, role: e.target.value }))} 
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 text-slate-800"
                        >
                          <option value="dispatcher">dispatcher</option>
                          <option value="driver">driver</option>
                          <option value="mover">mover</option>
                        </select>
                      </div>
                      <PrimaryBtn 
                        disabled={busy || !crewDraft.user_id} 
                        onClick={addCrew} 
                        className="w-full"
                        icon="plus"
                      >
                        Assign Crew Member
                      </PrimaryBtn>
                    </div>
                  </div>
                </div>

                {/* Fleet Assignment */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center gap-2">
                    <Icon name="truck" className="text-slate-400 w-4 h-4" />
                    <h2 className="font-extrabold text-sm text-slate-800">Fleet Assignment</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="space-y-2">
                      {assignedTrucks.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/20 group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
                              <Icon name="truck" className="w-4 h-4" />
                            </div>
                            <div className="truncate text-sm font-bold text-slate-900">{a.truck_name}</div>
                          </div>
                          <button 
                            type="button" 
                            disabled={busy} 
                            onClick={() => removeTruck(a.truck_id)} 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                          >
                            <Icon name="trash-2" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {!assignedTrucks.length && (
                        <div className="py-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                          <p className="text-xs font-bold text-slate-400 italic">No trucks assigned yet</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <select 
                        value={truckDraft.truck_id} 
                        onChange={(e) => setTruckDraft({ truck_id: e.target.value })} 
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 text-slate-800"
                      >
                        <option value="">Select Truck</option>
                        {trucks.filter((t) => t.is_active).map((t) => (
                          <option key={t.id} value={String(t.id)}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <PrimaryBtn 
                        disabled={busy || !truckDraft.truck_id} 
                        onClick={addTruck} 
                        className="w-full"
                        icon="plus"
                      >
                        Assign Vehicle
                      </PrimaryBtn>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Files &amp; Photos Repository</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Upload documentation, signed contracts, or job site images, and configure customer sharing permissions.</p>
            </div>
            <FilesPanel targetType="jobs.job" targetId={jobId} />
          </div>
        )}
      </main>
    </div>
  );
}
