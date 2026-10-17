import React, { useState, useEffect } from 'react';
import { Eye, Terminal, RefreshCw, X, AlertTriangle, CheckCircle2, ChevronRight, Loader2, ArrowUpRight } from 'lucide-react';
import { intakeAuditApi } from '../../../crm/leads/inboundApi';
import { Pill, StatusDot, GhostBtn, PrimaryBtn } from '../../../../shared/ui/RedesignAtoms';
import { useToast } from '../../../../shared/context/ToastContext';

const STATUS_CONFIG = {
  processed: { tone: 'green', dot: 'green', label: 'Processed' },
  rejected_duplicate: { tone: 'warn', dot: 'warn', label: 'Rejected Duplicate' },
  failed: { tone: 'rose', dot: 'rose', label: 'Failed' },
  ignored: { tone: 'slate', dot: 'slate', label: 'Ignored' },
  received: { tone: 'sky', dot: 'sky', label: 'Received' },
};

export default function LeadIntakeAuditLog() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [branchResults, setBranchResults] = useState([]);
  const [isLoadingBranchResults, setIsLoadingBranchResults] = useState(false);
  const [inspectorTab, setInspectorTab] = useState('summary');

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const data = await intakeAuditApi.listEvents({ limit: 100 });
      setEvents(data);
    } catch (err) {
      console.error('Failed to load intake events:', err);
      toast?.showError?.('Failed to load intake audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openInspector = async (event) => {
    setSelectedEvent(event);
    setInspectorTab('summary');
    setIsLoadingBranchResults(true);
    try {
      const results = await intakeAuditApi.getBranchResults(event.id);
      setBranchResults(results);
    } catch (err) {
      console.error('Failed to load branch results:', err);
      setBranchResults([]);
    } finally {
      setIsLoadingBranchResults(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Inbound Webhook Audit Log</h4>
          <p className="text-xs text-slate-500">Live immutable ledger of raw payloads received from external lead providers.</p>
        </div>
        <button
          type="button"
          onClick={loadEvents}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Log Table */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/40 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Received At</th>
                <th className="px-4 py-3">Provider ID</th>
                <th className="px-4 py-3">External Lead ID</th>
                <th className="px-4 py-3">Delivery Mode</th>
                <th className="px-4 py-3">Processing Status</th>
                <th className="px-4 py-3">Primary Lead</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {events.map((ev) => {
                const cfg = STATUS_CONFIG[ev.processing_status] || STATUS_CONFIG.received;
                return (
                  <tr key={ev.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {ev.received_at ? new Date(ev.received_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      Provider #{ev.provider_id || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                      {ev.external_lead_id || ev.idempotency_key || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">
                      {String(ev.delivery_mode || 'routed_single').replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={cfg.tone}>
                        <StatusDot tone={cfg.dot} />
                        <span>{cfg.label}</span>
                      </Pill>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {ev.primary_lead_id ? `#${ev.primary_lead_id}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openInspector(ev)}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs"
                      >
                        <Eye size={13} />
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No inbound lead events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Event Inspector Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal size={16} className="text-primary" />
                  Intake Event #{selectedEvent.id}
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  {selectedEvent.received_at ? new Date(selectedEvent.received_at).toLocaleString() : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 px-6 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setInspectorTab('summary')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
                  inspectorTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
                }`}
              >
                Delivery Summary
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('normalized')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
                  inspectorTab === 'normalized' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
                }`}
              >
                Normalized Data
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('raw')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
                  inspectorTab === 'raw' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
                }`}
              >
                Raw Webhook JSON
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {inspectorTab === 'summary' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4 space-y-2 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Processing Outcome</span>
                    <div className="flex items-center gap-2">
                      <Pill tone={(STATUS_CONFIG[selectedEvent.processing_status] || STATUS_CONFIG.received).tone}>
                        <StatusDot tone={(STATUS_CONFIG[selectedEvent.processing_status] || STATUS_CONFIG.received).dot} />
                        <span>{(STATUS_CONFIG[selectedEvent.processing_status] || STATUS_CONFIG.received).label}</span>
                      </Pill>
                      {selectedEvent.primary_lead_id && (
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                          Primary Lead Created: #{selectedEvent.primary_lead_id}
                        </span>
                      )}
                    </div>
                    {selectedEvent.error_message && (
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/30">
                        {selectedEvent.error_message}
                      </p>
                    )}
                  </div>

                  {/* Branch Delivery Results */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                      Branch Delivery Results
                    </span>
                    {isLoadingBranchResults ? (
                      <div className="flex h-20 items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={18} />
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs dark:divide-slate-800 dark:border-slate-800">
                        {branchResults.map((res) => (
                          <div key={res.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">Branch #{res.branch_id}</span>
                              {res.reason && <p className="text-[11px] text-slate-400 mt-0.5">{res.reason}</p>}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              res.result_status === 'created'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                            }`}>
                              {res.result_status}
                            </span>
                          </div>
                        ))}
                        {branchResults.length === 0 && (
                          <p className="p-3 text-center text-xs text-slate-400">No branch outcome records.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {inspectorTab === 'normalized' && (
                <div className="space-y-2">
                  <pre className="rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-emerald-400 overflow-x-auto dark:border-slate-800">
                    {JSON.stringify(selectedEvent.normalized_payload || {}, null, 2)}
                  </pre>
                </div>
              )}

              {inspectorTab === 'raw' && (
                <div className="space-y-2">
                  <pre className="rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-sky-300 overflow-x-auto dark:border-slate-800">
                    {JSON.stringify(selectedEvent.raw_payload || {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 flex justify-end">
              <GhostBtn onClick={() => setSelectedEvent(null)}>Close Inspector</GhostBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
