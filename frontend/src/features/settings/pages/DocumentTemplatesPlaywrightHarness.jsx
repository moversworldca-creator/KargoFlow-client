import React from 'react';
import DocumentTemplates from '../components/DocumentTemplates';

export default function DocumentTemplatesPlaywrightHarness() {
  return (
    <div className="min-h-screen bg-page p-3 sm:p-4">
      <DocumentTemplates branchId={5} />
    </div>
  );
}
