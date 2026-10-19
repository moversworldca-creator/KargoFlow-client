import React from 'react';
import EstimatesWorkspace from '../components/EstimatesWorkspace';

// Playwright harness: the Opportunity Estimate tab without the full SalesDetail page.
export default function EstimatesPlaywrightHarness() {
  return (
    <div className="min-h-screen bg-page p-4 md:p-6">
      <EstimatesWorkspace opportunityId={4} customerEmail="pat@example.com" />
    </div>
  );
}
