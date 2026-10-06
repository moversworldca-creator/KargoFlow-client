import React from 'react';
import EstimateView from '../components/EstimateView';

const harnessOpportunity = {
  id: 9001,
  branch: { id: 11, name: 'Playwright Branch' },
  branch_id: 11,
  service_type: 'moving',
  status: 'estimate',
  workflow_stage: 'estimate',
  customer_details: {
    full_name: 'Playwright Customer',
    first_name: 'Playwright',
    last_name: 'Customer',
    email: 'playwright@example.com',
    phone: '555-0100',
  },
  origin_address_details: {
    address_line1: '123 Origin St',
    city: 'Calgary',
    state: 'AB',
  },
  destination_address_details: {
    address_line1: '456 Destination Ave',
    city: 'Toronto',
    state: 'ON',
  },
};

const harnessSubJobs = [
  {
    id: 'harness-job-1',
    sequence: 1,
    title: 'Moving',
    service_type: 'moving',
    move_date: '2026-08-13',
    truck_count: 1,
    crew_size: 2,
  },
];

export default function EstimateViewPlaywrightHarness() {
  return (
    <div className="min-h-screen bg-page p-4 md:p-6">
      <EstimateView
        opportunity={harnessOpportunity}
        initialSubTab="charges"
        opportunityJobs={harnessSubJobs}
        subJobServiceOptions={[{ value: 'moving', label: 'Moving' }]}
        selectedSubJobId="harness-job-1"
        canCreateOpportunity
        canEditOpportunity
      />
    </div>
  );
}
