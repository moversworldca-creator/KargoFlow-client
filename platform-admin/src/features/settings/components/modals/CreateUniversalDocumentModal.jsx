import React from 'react';
import { createPortal } from 'react-dom';
import GlobalTemplateCreateForm from '../GlobalTemplateCreateForm';
import { getTemplateMode } from '../UnifiedTemplateBuilder/core/globalTemplateAdapter';

export default function CreateUniversalDocumentModal({ isOpen, onClose, onCreated }) {
  if (!isOpen) return null;
  return createPortal(<div role="dialog" aria-label="Create global template" className="fixed inset-0 z-50 bg-slate-900/60 p-6 flex items-center justify-center">
    <GlobalTemplateCreateForm onClose={onClose} onCreated={(template) => onCreated?.(template, {
      mode: getTemplateMode(template),
      group: template.kind === 'communication' ? 'comm' : template.kind === 'estimate_portal' ? 'estimate' : 'legal',
    })} />
  </div>, document.body);
}
