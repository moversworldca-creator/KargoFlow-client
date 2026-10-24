import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectedJobOperationalSummary, {
  getSelectedJobCharges,
  calculateSelectedJobSubtotal,
  getTariffMinimumHours,
  formatRouteDuration,
  formatRouteDistance,
  fmtMoney,
} from './SelectedJobOperationalSummary';

describe('SelectedJobOperationalSummary Component', () => {
  const job1 = {
    id: 101,
    title: 'Local Move',
    service_type: 'moving',
    sequence: 1,
    sales_number: '77527',
    sub_job_number: '77527-1',
    move_date: '2026-10-22',
    arrival_window_start: '08:00 AM',
    arrival_window_end: '10:00 AM',
    confirmation_state: 'confirmed',
  };

  const job2 = {
    id: 102,
    title: 'Full Packing',
    service_type: 'packing',
    sequence: 2,
    sales_number: '77527',
    sub_job_number: '77527-2',
    move_date: '2026-10-21',
    arrival_window_start: '01:00 PM',
    arrival_window_end: '03:00 PM',
    confirmation_state: 'tentative',
  };

  const subJobServiceOptions = [
    { value: 'moving', label: 'Local Moving' },
    { value: 'packing', label: 'Packing Service' },
  ];

  const calculationTrace = {
    tariff_name: 'Residential Tariff 2026',
    jobs: [
      {
        planned_job_id: 101,
        title: 'Local Move',
        resources: {
          crew: 3,
          trucks: 2,
          hours: '5.50',
          auto: true,
          estimated_hours: '5.50',
          minimum_hours: '3.00',
        },
        totals: {
          job_subtotal: '850.00',
        },
      },
      {
        planned_job_id: 102,
        title: 'Full Packing',
        resources: {
          crew: 2,
          trucks: 1,
          hours: '3.00',
          auto: false, // estimator manual inputs
          estimated_hours: '3.00',
          minimum_hours: '2.00',
        },
        totals: {
          job_subtotal: '320.00',
        },
      },
    ],
  };

  const allCharges = [
    // Job 1 charges
    {
      id: 1,
      name: 'Moving Labor',
      planned_sub_job_id: 101,
      category: 'labor',
      total_price: '650.00',
      source_type: 'tariff',
      metadata: { detail: { minimum_hours: '3.00' } },
    },
    {
      id: 2,
      name: 'Truck Fee',
      planned_sub_job_id: 101,
      category: 'transportation',
      total_price: '200.00',
      source_type: 'tariff',
    },
    // Job 2 charges
    {
      id: 3,
      name: 'Packing Labor',
      planned_sub_job_id: 102,
      category: 'packing',
      total_price: '220.00',
      source_type: 'tariff',
      metadata: { detail: { minimum_hours: '2.00' } },
    },
    {
      id: 4,
      name: 'Packing Materials',
      planned_sub_job_id: 102,
      category: 'materials',
      total_price: '100.00',
      source_type: 'manual',
    },
    // Estimate-level discount (MUST remain outside any job subtotal)
    {
      id: 5,
      name: 'Autumn Special $50 Off',
      category: 'discount',
      source_type: 'discount',
      total_price: '50.00',
    },
  ];

  it('renders operational details for selected job 1 correctly', () => {
    const onOpenJobScheduler = vi.fn();

    render(
      <SelectedJobOperationalSummary
        selectedSubJob={job1}
        allSubJobs={[job1, job2]}
        subJobServiceOptions={subJobServiceOptions}
        calculationTrace={calculationTrace}
        charges={allCharges}
        routeSummary={{ distanceMiles: 42.5, durationMinutes: 75 }}
        routeStops={[{ id: 1 }, { id: 2 }]}
        onOpenJobScheduler={onOpenJobScheduler}
      />
    );

    // 1. Service type and job number
    expect(screen.getByTestId('selected-job-service-type')).toHaveTextContent('Local Moving');
    expect(screen.getByTestId('selected-job-number')).toHaveTextContent('#77527-1');

    // 2. Confirmation state
    expect(screen.getByTestId('selected-job-confirmation-state')).toHaveTextContent('Confirmed');

    // 3. Move date and arrival window
    const dateButton = screen.getByTestId('selected-job-date-button');
    expect(dateButton).toHaveTextContent('Oct 22, 2026 @ 08:00 AM - 10:00 AM');
    fireEvent.click(dateButton);
    expect(onOpenJobScheduler).toHaveBeenCalledWith(101);

    // 4. Rated resources with Auto-calculated badge
    expect(screen.getByTestId('resource-source-badge')).toHaveTextContent('Auto-calculated');
    expect(screen.getByTestId('job-truck-count')).toHaveTextContent('2 Trucks');
    expect(screen.getByTestId('job-crew-count')).toHaveTextContent('3 Movers');
    expect(screen.getByTestId('job-labor-hours')).toHaveTextContent('5.50 hrs');
    expect(screen.getByTestId('job-min-hours')).toHaveTextContent('(Min. Hrs. 3.00)');

    // 5. Route logistics
    expect(screen.getByTestId('selected-job-route-summary')).toHaveTextContent('1h 15m / 42.5 mi · 2 stops');

    // 6. Selected job subtotal (650 + 200 = 850, strictly excludes Job 2 and discount)
    expect(screen.getByTestId('selected-job-subtotal')).toHaveTextContent('$850.00');
  });

  it('renders operational details for job 2 with Manual inputs badge when switching tabs', () => {
    render(
      <SelectedJobOperationalSummary
        selectedSubJob={job2}
        allSubJobs={[job1, job2]}
        subJobServiceOptions={subJobServiceOptions}
        calculationTrace={calculationTrace}
        charges={allCharges}
        routeSummary={{ distanceMiles: 15.0, durationMinutes: 30 }}
        routeStops={[{ id: 1 }]}
      />
    );

    // Job 2 service type and number
    expect(screen.getByTestId('selected-job-service-type')).toHaveTextContent('Packing Service');
    expect(screen.getByTestId('selected-job-number')).toHaveTextContent('#77527-2');

    // Job 2 confirmation state
    expect(screen.getByTestId('selected-job-confirmation-state')).toHaveTextContent('Tentative');

    // Date & window
    expect(screen.getByTestId('selected-job-date-button')).toHaveTextContent('Oct 21, 2026 @ 01:00 PM - 03:00 PM');

    // Resources show Job 2 rated resources (NEVER Job 1's) and Manual inputs badge
    expect(screen.getByTestId('resource-source-badge')).toHaveTextContent('Manual inputs');
    expect(screen.getByTestId('job-truck-count')).toHaveTextContent('1 Truck');
    expect(screen.getByTestId('job-crew-count')).toHaveTextContent('2 Movers');
    expect(screen.getByTestId('job-labor-hours')).toHaveTextContent('3.00 hrs');
    expect(screen.getByTestId('job-min-hours')).toHaveTextContent('(Min. Hrs. 2.00)');

    // Selected job subtotal (220 + 100 = 320, strictly excludes Job 1 and discount)
    expect(screen.getByTestId('selected-job-subtotal')).toHaveTextContent('$320.00');
  });

  it('renders Missing source badge and placeholders when tariff could not calculate resources', () => {
    const jobWithoutTrace = {
      id: 999,
      title: 'Storage Service',
      service_type: 'storage',
      sequence: 3,
      confirmation_state: 'unconfirmed',
      move_date: null,
    };

    render(
      <SelectedJobOperationalSummary
        selectedSubJob={jobWithoutTrace}
        allSubJobs={[job1, job2, jobWithoutTrace]}
        calculationTrace={{ jobs: [] }}
        charges={[]}
        routeSummary={null}
        routeStops={[]}
      />
    );

    // Missing badge
    expect(screen.getByTestId('resource-source-badge')).toHaveTextContent('Missing');

    // Resource placeholders
    expect(screen.getByTestId('job-truck-count')).toHaveTextContent('— Trucks');
    expect(screen.getByTestId('job-crew-count')).toHaveTextContent('— Movers');
    expect(screen.getByTestId('job-labor-hours')).toHaveTextContent('— hrs');
    expect(screen.getByTestId('job-min-hours')).toHaveTextContent('(Min. Hrs. —)');

    // Unscheduled date button
    expect(screen.getByTestId('selected-job-date-button')).toHaveTextContent('Unscheduled — Set Move Date');

    // Missing route logistics empty state
    expect(screen.getByTestId('selected-job-route-summary')).toHaveTextContent('Route logistics not configured');

    // Subtotal empty
    expect(screen.getByTestId('selected-job-subtotal')).toHaveTextContent('$0.00');
  });

  it('disables date button when estimate is locked', () => {
    const onOpenJobScheduler = vi.fn();
    render(
      <SelectedJobOperationalSummary
        selectedSubJob={job1}
        allSubJobs={[job1]}
        calculationTrace={calculationTrace}
        charges={allCharges}
        isLocked={true}
        onOpenJobScheduler={onOpenJobScheduler}
      />
    );

    const dateBtn = screen.getByTestId('selected-job-date-button');
    expect(dateBtn).toBeDisabled();
    fireEvent.click(dateBtn);
    expect(onOpenJobScheduler).not.toHaveBeenCalled();
  });

  it('renders empty placeholder when no selectedSubJob is provided', () => {
    render(<SelectedJobOperationalSummary selectedSubJob={null} />);
    expect(screen.getByTestId('selected-job-summary-empty')).toHaveTextContent('No planned job selected.');
  });
});

describe('Helper functions', () => {
  it('getSelectedJobCharges filters strictly by planned job and excludes discounts', () => {
    const charges = [
      { id: 1, planned_sub_job_id: 10, total_price: '100' },
      { id: 2, planned_sub_job_id: 20, total_price: '200' },
      { id: 3, planned_sub_job_id: 10, category: 'discount', total_price: '30' },
      { id: 4, planned_sub_job_id: 10, source_type: 'discount', total_price: '20' },
    ];
    const subJobs = [{ id: 10 }, { id: 20 }];

    const filtered10 = getSelectedJobCharges(charges, 10, subJobs);
    expect(filtered10).toHaveLength(1);
    expect(filtered10[0].id).toBe(1);

    const filtered20 = getSelectedJobCharges(charges, 20, subJobs);
    expect(filtered20).toHaveLength(1);
    expect(filtered20[0].id).toBe(2);
  });

  it('calculateSelectedJobSubtotal falls back to trace job_subtotal when charge lines are not loaded', () => {
    const jobTrace = { totals: { job_subtotal: '450.50' } };
    const subtotal = calculateSelectedJobSubtotal([], 10, [{ id: 10 }], jobTrace);
    expect(subtotal).toBe(450.5);
  });

  it('getTariffMinimumHours resolves across trace, charges, job inputs and sub-job', () => {
    // 1. Trace resources priority
    expect(getTariffMinimumHours({ minimum_hours: '4.00' })).toBe(4);

    // 2. Trace job
    expect(getTariffMinimumHours(null, { minimum_hours: '3.50' })).toBe(3.5);

    // 3. Charge line detail
    const charges = [{ metadata: { detail: { minimum_hours: '2.50' } } }];
    expect(getTariffMinimumHours(null, null, charges)).toBe(2.5);

    // 4. Job inputs
    expect(getTariffMinimumHours(null, null, [], { id: 5 }, { 5: { minimum_hours: '3.00' } })).toBe(3);

    // 5. Sub-job fallback
    expect(getTariffMinimumHours(null, null, [], { id: 5, minimum_hours: '2.00' })).toBe(2);

    // 6. Not available
    expect(getTariffMinimumHours(null, null, [], null)).toBeNull();
  });

  it('formatRouteDuration formats minutes to hours and minutes', () => {
    expect(formatRouteDuration(0)).toBe('0 min');
    expect(formatRouteDuration(45)).toBe('45m');
    expect(formatRouteDuration(60)).toBe('1h');
    expect(formatRouteDuration(125)).toBe('2h 5m');
  });

  it('formatRouteDistance formats miles to 1 decimal place', () => {
    expect(formatRouteDistance(0)).toBe('0.0 mi');
    expect(formatRouteDistance(12.34)).toBe('12.3 mi');
  });

  it('fmtMoney formats numbers to US currency string', () => {
    expect(fmtMoney(0)).toBe('$0.00');
    expect(fmtMoney(1234.5)).toBe('$1,234.50');
  });
});
