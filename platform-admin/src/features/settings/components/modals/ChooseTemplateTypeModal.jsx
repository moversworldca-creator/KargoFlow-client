import React, { useState, useEffect, useRef } from 'react';
import { X, FileSignature, FileSpreadsheet, Mail, MessageSquare, ArrowRight, Check } from 'lucide-react';

export const TEMPLATE_TYPES = [
  {
    id: 'document',
    label: 'Document Template',
    badge: 'Legal & Operations',
    description: 'Legal contracts, bills of lading, payment invoices, and credit card authorizations for Opportunities and Jobs.',
    icon: FileSignature,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    selectedBorder: 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20',
  },
  {
    id: 'estimate',
    label: 'Estimate Template',
    badge: 'Customer Portal',
    description: 'Interactive estimate portals, dynamic rate calculations, pricing tables, and service charge summaries for client presentation.',
    icon: FileSpreadsheet,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-50 dark:bg-purple-950/40',
    selectedBorder: 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40 dark:bg-purple-950/20',
  },
  {
    id: 'communication',
    label: 'Email & SMS Template',
    badge: 'Messaging & Alerts',
    description: 'Transactional email notifications, booking confirmations, dispatch alerts, and SMS text message sequences.',
    icon: Mail,
    iconSecondary: MessageSquare,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    selectedBorder: 'border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20',
  },
];

export default function ChooseTemplateTypeModal({
  isOpen,
  onClose,
  onSelectType,
  initialType = 'document',
}) {
  const [selectedType, setSelectedType] = useState(initialType || 'document');
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const validInitial = TEMPLATE_TYPES.some((t) => t.id === initialType) ? initialType : 'document';
      setSelectedType(validInitial);
    }
  }, [isOpen, initialType]);

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const currentIndex = TEMPLATE_TYPES.findIndex((t) => t.id === selectedType);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % TEMPLATE_TYPES.length;
        setSelectedType(TEMPLATE_TYPES[nextIndex].id);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + TEMPLATE_TYPES.length) % TEMPLATE_TYPES.length;
        setSelectedType(TEMPLATE_TYPES[prevIndex].id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedType) {
          onSelectType(selectedType);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedType, onClose, onSelectType]);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (selectedType) {
      onSelectType(selectedType);
    }
  };

  const handleCardDoubleClick = (typeId) => {
    setSelectedType(typeId);
    onSelectType(typeId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-template-type-title"
      ref={modalRef}
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 id="choose-template-type-title" className="text-lg font-bold text-slate-800 dark:text-white">
              Create a New Template
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose the category of template you want to build. You can customize the details in the next step.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-50/75 dark:bg-slate-800/40 px-6 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">1</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold">Step 1: Choose Template Category</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-400">Step 2: Template Details & Starting Layout</span>
        </div>

        {/* Cards Body */}
        <div className="p-6 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" role="radiogroup" aria-label="Template categories">
            {TEMPLATE_TYPES.map((type) => {
              const Icon = type.icon;
              const SecondaryIcon = type.iconSecondary;
              const isSelected = selectedType === type.id;

              return (
                <div
                  key={type.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedType(type.id)}
                  onDoubleClick={() => handleCardDoubleClick(type.id)}
                  className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all select-none text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isSelected
                      ? type.selectedBorder
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-850 hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {/* Selected check badge */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}

                  <div>
                    {/* Icon & Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${type.iconBg} ${type.iconColor} shrink-0`}>
                        <Icon size={18} />
                        {SecondaryIcon && <SecondaryIcon size={12} className="ml-0.5 -mr-0.5" />}
                      </div>
                    </div>

                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-1.5">
                      {type.badge}
                    </span>

                    <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight mb-1.5">
                      {type.label}
                    </h3>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {type.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Double-click to continue</span>
                    <ArrowRight size={11} className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedType}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition"
          >
            <span>Continue</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
