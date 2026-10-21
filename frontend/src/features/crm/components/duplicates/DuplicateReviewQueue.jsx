import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, X, Loader2, ArrowRight } from 'lucide-react';
import { getLead, getDuplicateReviewQueue } from '../../../../services/api';
import DuplicateComparisonModal from './DuplicateComparisonModal';
import { Pill, StatusDot, GhostBtn, PrimaryBtn } from '../../../../shared/ui/RedesignAtoms';
import { useToast } from '../../../../shared/context/ToastContext';

export default function DuplicateReviewQueue({ isOpen, onClose }) {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState('pending');
  const [activeReview, setActiveReview] = useState(null);
  const [activeSubjectLead, setActiveSubjectLead] = useState(null);
  const [isLoadingSubject, setIsLoadingSubject] = useState(false);

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const data = await getDuplicateReviewQueue({
        decision: filterDecision || undefined,
        limit: 100,
      });
      setReviews(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error('Failed to load duplicate queue:', err);
      toast?.showError?.('Failed to load duplicate review queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen, filterDecision]);

  if (!isOpen) return null;

  const handleOpenComparison = async (rev) => {
    setIsLoadingSubject(true);
    try {
      const lead = await getLead(rev.subject_lead_id);
      setActiveSubjectLead(lead);
      setActiveReview(rev);
    } catch (err) {
      console.error('Failed to load subject lead:', err);
      toast?.showError?.('Could not load lead details for review');
    } finally {
      setIsLoadingSubject(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Duplicate Leads Review Queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Staff queue for triaging and resolving potential duplicate inbound submissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadQueue}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-primary rounded-lg"
              title="Refresh Queue"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-2.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 text-xs">
          <span className="font-bold text-slate-400 uppercase text-[10px] mr-1">Status:</span>
          {['pending', 'confirmed_duplicate', 'repeat_customer', 'not_duplicate', 'merged', 'ignored', ''].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFilterDecision(d)}
              className={`px-2.5 py-1 rounded-lg font-bold transition capitalize text-xs ${
                filterDecision === d
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {d ? d.replace('_', ' ') : 'All Reviews'}
            </button>
          ))}
        </div>

        {/* Queue Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 font-bold uppercase text-[10px] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Subject Lead</th>
                    <th className="px-4 py-3">Matching Candidate</th>
                    <th className="px-4 py-3">Matched Contact Fields</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {reviews.map((r) => {
                    const matches = r.match_fields || {};
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          Lead #{r.subject_lead_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-700 dark:text-amber-400 font-bold">
                          {r.candidate_lead_id ? `Lead #${r.candidate_lead_id}` : r.candidate_customer_id ? `Customer #${r.candidate_customer_id}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {matches.email && (
                              <span className="rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold border border-amber-200 dark:border-amber-900/40">
                                Email Matched
                              </span>
                            )}
                            {matches.phone && (
                              <span className="rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold border border-amber-200 dark:border-amber-900/40">
                                Phone Matched
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.decision === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                          }`}>
                            {r.decision.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenComparison(r)}
                            disabled={isLoadingSubject}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-primary/90 transition active:scale-95"
                          >
                            Triage
                            <ArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {reviews.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                        No duplicate reviews found matching this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <span className="text-xs text-slate-500">
            Total In Queue: <strong>{reviews.length}</strong>
          </span>
          <GhostBtn onClick={onClose}>Close</GhostBtn>
        </div>
      </div>

      {/* Comparison Modal */}
      {activeReview && activeSubjectLead && (
        <DuplicateComparisonModal
          isOpen={Boolean(activeReview)}
          onClose={() => {
            setActiveReview(null);
            setActiveSubjectLead(null);
          }}
          subjectLead={activeSubjectLead}
          review={activeReview}
          onResolved={() => {
            loadQueue();
          }}
        />
      )}
    </div>
  );
}
