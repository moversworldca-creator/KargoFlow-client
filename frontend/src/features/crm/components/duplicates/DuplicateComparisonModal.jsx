import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, UserCheck, Ban, ArrowRight, Loader2, CopyCheck } from 'lucide-react';
import { leadApi } from '../../leads/leadApi';
import { GhostBtn, PrimaryBtn, Pill, StatusDot } from '../../../../shared/ui/RedesignAtoms';
import { useToast } from '../../../../shared/context/ToastContext';

export default function DuplicateComparisonModal({
  isOpen,
  onClose,
  subjectLead,
  review,
  onResolved,
}) {
  const toast = useToast();
  const [candidateData, setCandidateData] = useState(null);
  const [isLoadingCandidate, setIsLoadingCandidate] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState('confirmed_duplicate');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !review) {
      setCandidateData(null);
      setNotes('');
      return;
    }

    if (review.decision && review.decision !== 'pending') {
      setSelectedDecision(review.decision);
      setNotes(review.notes || '');
    } else {
      setSelectedDecision('confirmed_duplicate');
      setNotes('');
    }

    if (review.candidate_lead_id) {
      setIsLoadingCandidate(true);
      leadApi.get(review.candidate_lead_id)
        .then(res => setCandidateData(res))
        .catch(err => {
          console.error('Failed to load candidate lead details:', err);
          setCandidateData(null);
        })
        .finally(() => setIsLoadingCandidate(false));
    } else {
      setCandidateData(null);
    }
  }, [isOpen, review]);

  if (!isOpen || !review || !subjectLead) return null;

  const matches = review.match_fields || {};

  const handleResolve = async () => {
    if (!selectedDecision) return;
    setIsSubmitting(true);
    try {
      await leadApi.resolveDuplicateReview(subjectLead.id, review.id, {
        decision: selectedDecision,
        notes: notes.trim(),
      });
      toast?.showSuccess?.(`Duplicate review resolved as ${selectedDecision.replace('_', ' ')}.`);
      onResolved?.();
      onClose();
    } catch (err) {
      console.error('Failed to resolve duplicate review:', err);
      toast?.showError?.(err?.response?.data?.detail || err?.message || 'Failed to resolve duplicate review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const DECISIONS = [
    {
      id: 'confirmed_duplicate',
      label: 'Confirmed Duplicate',
      icon: AlertTriangle,
      color: 'border-rose-300 bg-rose-50/50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
      description: 'The same person submitted this lead multiple times. Keep records linked.',
    },
    {
      id: 'repeat_customer',
      label: 'Repeat Customer',
      icon: UserCheck,
      color: 'border-blue-300 bg-blue-50/50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
      description: 'An existing client initiating a new, separate move request.',
    },
    {
      id: 'not_duplicate',
      label: 'Not a Duplicate',
      icon: CheckCircle2,
      color: 'border-emerald-300 bg-emerald-50/50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
      description: 'False positive match (e.g. shared household or phone). Treat as completely new.',
    },
    {
      id: 'merged',
      label: 'Documented Merge',
      icon: CopyCheck,
      color: 'border-purple-300 bg-purple-50/50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300',
      description: 'Details have been manually merged into the existing customer/lead record.',
    },
    {
      id: 'ignored',
      label: 'Dismiss / Ignore',
      icon: Ban,
      color: 'border-slate-300 bg-slate-50/50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
      description: 'Dismiss review alert without changing lead records.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Duplicate Lead Comparison & Resolution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review matched contact information and record staff decision
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject Lead */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/80 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Lead (Subject)</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">#{subjectLead.id}</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{subjectLead.full_name || `${subjectLead.first_name || ''} ${subjectLead.last_name || ''}`.trim() || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                  <span className={`font-semibold ${matches.email ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded' : 'text-slate-700 dark:text-slate-300'}`}>
                    {subjectLead.email || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone</span>
                  <span className={`font-semibold ${matches.phone ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded' : 'text-slate-700 dark:text-slate-300'}`}>
                    {subjectLead.phone || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Move Date</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{subjectLead.move_date || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {[subjectLead.origin_city, subjectLead.origin_state].filter(Boolean).join(', ') || '-'} &rarr; {[subjectLead.destination_city, subjectLead.destination_state].filter(Boolean).join(', ') || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Candidate Match */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-amber-200/80 dark:border-amber-900/30">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Existing Match Candidate
                </span>
                <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300">
                  {review.candidate_lead_id ? `Lead #${review.candidate_lead_id}` : review.candidate_customer_id ? `Customer #${review.candidate_customer_id}` : '-'}
                </span>
              </div>

              {isLoadingCandidate ? (
                <div className="flex h-36 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                </div>
              ) : candidateData ? (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Name</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{candidateData.full_name || `${candidateData.first_name || ''} ${candidateData.last_name || ''}`.trim() || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                    <span className={`font-semibold ${matches.email ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded' : 'text-slate-700 dark:text-slate-300'}`}>
                      {candidateData.email || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone</span>
                    <span className={`font-semibold ${matches.phone ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded' : 'text-slate-700 dark:text-slate-300'}`}>
                      {candidateData.phone || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Move Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{candidateData.move_date || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">State / Status</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{candidateData.system_state || candidateData.status || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Historical match based on:
                  <div className="mt-2 flex justify-center gap-2 font-mono font-bold text-amber-700 dark:text-amber-400">
                    {matches.email && <span className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">Email matched</span>}
                    {matches.phone && <span className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">Phone matched</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
              Select Resolution Decision
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DECISIONS.map((item) => {
                const isSelected = selectedDecision === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedDecision(item.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? `${item.color} ring-2 ring-primary/40`
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold leading-tight">{item.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Staff Review Notes (Audit Trail)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add explanation for this decision (optional)..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <GhostBtn onClick={onClose} disabled={isSubmitting}>
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={handleResolve} loading={isSubmitting}>
            Submit Resolution
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
