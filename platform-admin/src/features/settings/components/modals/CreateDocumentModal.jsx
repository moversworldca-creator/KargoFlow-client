import React from 'react';
import GlobalTemplateCreateForm from '../GlobalTemplateCreateForm';
import { getTemplateMode } from '../UnifiedTemplateBuilder/core/globalTemplateAdapter';

export default function CreateDocumentModal({ isOpen, onClose, onCreated }) {
  if (!isOpen) return null;
  return <GlobalTemplateCreateForm onClose={onClose} onCreated={(template) => onCreated?.(template, {
      mode: getTemplateMode(template),
      group: template.kind === 'communication' ? 'comm' : template.kind === 'estimate_portal' ? 'estimate' : 'legal',
    })} />;
}
