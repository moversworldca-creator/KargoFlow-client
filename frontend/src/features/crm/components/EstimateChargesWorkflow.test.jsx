import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  ChargesTab,
  CATEGORY_PRESENTATION_MAP,
  normalizeCategory,
} from './RedesignEstimateComponents';
import {
  AddChargeModal,
  EditChargeModal,
} from './EstimateChargeModals';

describe('normalizeCategory', () => {
  it('maps legacy category keys to modern backend keys', () => {
    expect(normalizeCategory('moving_labor')).toBe('labor');
    expect(normalizeCategory('trip_and_travel')).toBe('travel');
    expect(normalizeCategory('fuel_surcharge')).toBe('fuel');
    expect(normalizeCategory('storage_in_transit')).toBe('storage');
    expect(normalizeCategory('additional_services')).toBe('services');
    expect(normalizeCategory('bulky_item')).toBe('bulky_items');
    expect(normalizeCategory('shuttle_fees')).toBe('shuttle');
  });

  it('preserves valid modern backend categories', () => {
    expect(normalizeCategory('labor')).toBe('labor');
    expect(normalizeCategory('travel')).toBe('travel');
    expect(normalizeCategory('fuel')).toBe('fuel');
    expect(normalizeCategory('materials')).toBe('materials');
    expect(normalizeCategory('packing')).toBe('packing');
    expect(normalizeCategory('valuation')).toBe('valuation');
    expect(normalizeCategory('discount')).toBe('discount');
  });

  it('falls back to other for unknown categories', () => {
    expect(normalizeCategory('unknown_xyz')).toBe('other');
  });
});

describe('ChargesTab Component', () => {
  const mockEstimate = {
    id: 101,
    edit_version: 4,
    lifecycle_state: 'draft',
    subtotal: '1250.00',
    discount_amount: '100.00',
    taxable_subtotal: '1150.00',
    sales_tax_pct: '13',
    sales_tax_amount: '149.50',
    grand_total: '1299.50',
    deposit_amount: '129.95',
    not_to_exceed_amount: '1500.00',
    not_to_exceed_is_manual: false,
    tax_exempt: false,
    repricing: { needed: false, reasons: [] },
    below_minimum_booking_amount: false,
    approvals: { outstanding_rule_ids: [], required_rules: [] },
    inputs: {
      jobs: {
        '1': {
          crew_size: 3,
          trucks: 1,
          hours: '4.5',
          volume_cuft: '500',
          weight_lbs: '3500',
          distance_miles: '25.0',
        },
      },
      deposit: { type: 'percentage', value: '10' },
    },
  };

  const mockCharges = [
    {
      id: 201,
      name: 'Moving Labor',
      category: 'labor',
      source_type: 'tariff',
      unit_price: '180.00',
      quantity: '4',
      unit: 'hour',
      subtotal: '720.00',
      total_price: '720.00',
      total_cost: '720.00',
      is_manual_override: true,
      metadata: { calculated_amount: '680.00' },
    },
    {
      id: 202,
      name: 'Piano Handling',
      category: 'services',
      source_type: 'manual',
      unit_price: '150.00',
      quantity: '1',
      unit: 'each',
      subtotal: '150.00',
      total_price: '150.00',
      total_cost: '150.00',
      is_manual_override: false,
    },
    {
      id: 203,
      name: 'Spring Special',
      category: 'discount',
      source_type: 'discount',
      unit_price: '100.00',
      quantity: '1',
      unit: 'each',
      subtotal: '100.00',
      total_price: '100.00',
      total_cost: '100.00',
      metadata: { discount_type: 'amount', value: '100.00' },
    },
  ];

  const mockSubJobs = [
    {
      id: '1',
      title: 'Move',
      sub_job_number: 'EST-101-1',
      service_type: 'moving',
      move_date: '2026-11-10',
    },
  ];

  it('renders tariff charges with source badge, overridden badge, and calculated tariff rate', () => {
    render(
      <ChargesTab
        estimate={mockEstimate}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
        selectedSubJob={mockSubJobs[0]}
      />
    );

    // Moving labor charge should be displayed with Tariff and Overridden badge
    expect(screen.getByText('Moving Labor')).toBeInTheDocument();
    expect(screen.getByText('Tariff')).toBeInTheDocument();
    expect(screen.getByText('Overridden')).toBeInTheDocument();
    expect(screen.getByText(/Calculated tariff price: \$680\.00/i)).toBeInTheDocument();

    // Manual charge should be displayed with Manual badge
    expect(screen.getByText('Piano Handling')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();

    // Discount charge should be displayed in the applied discounts subsection
    expect(screen.getByText('Spring Special')).toBeInTheDocument();
  });

  it('disables delete on tariff lines and provides restore tariff price', async () => {
    const handleClearOverride = vi.fn();
    const handleEditCharge = vi.fn();

    render(
      <ChargesTab
        estimate={mockEstimate}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
        selectedSubJob={mockSubJobs[0]}
        onClearOverride={handleClearOverride}
        onEditCharge={handleEditCharge}
      />
    );

    // Open actions menu for the tariff charge (id: 201)
    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[0]);

    // Delete should be disabled for tariff line
    expect(screen.getByText(/Delete \(Tariff locked\)/i)).toBeInTheDocument();

    // Restore tariff price should be available
    const restoreBtn = screen.getByText('Restore Tariff Price');
    expect(restoreBtn).toBeInTheDocument();
    fireEvent.click(restoreBtn);
    expect(handleClearOverride).toHaveBeenCalledWith(201);
  });

  it('displays repricing banner when needed and triggers recalculate', () => {
    const handleRecalculate = vi.fn();
    const estimateWithRepricing = {
      ...mockEstimate,
      repricing: {
        needed: true,
        reasons: ['Tariff version changed', 'Move date weekday changed'],
      },
    };

    render(
      <ChargesTab
        estimate={estimateWithRepricing}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
        onRecalculate={handleRecalculate}
      />
    );

    expect(screen.getByText('Repricing Required')).toBeInTheDocument();
    expect(screen.getByText(/Tariff version changed, Move date weekday changed/i)).toBeInTheDocument();

    const recalcBtn = screen.getByRole('button', { name: /Recalculate Estimate/i });
    fireEvent.click(recalcBtn);
    expect(handleRecalculate).toHaveBeenCalled();
  });

  it('displays below minimum booking amount warning', () => {
    const estimateBelowMinimum = {
      ...mockEstimate,
      grand_total: '250.00',
      below_minimum_booking_amount: true,
      calculation_trace: { minimum_booking_amount: '500.00' },
    };

    render(
      <ChargesTab
        estimate={estimateBelowMinimum}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
      />
    );

    expect(screen.getByText(/is below the tariff minimum booking amount/i)).toBeInTheDocument();
  });

  it('displays manager approval banner when approval is required', () => {
    const handleRequestApproval = vi.fn();
    const estimateApprovalRequired = {
      ...mockEstimate,
      approvals: {
        outstanding_rule_ids: [1],
        required_rules: [{ id: 1, name: 'Discount Over 15%', rule_type: 'discount' }],
      },
    };

    render(
      <ChargesTab
        estimate={estimateApprovalRequired}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
        onRequestApproval={handleRequestApproval}
      />
    );

    expect(screen.getByText('Manager Approval Required')).toBeInTheDocument();
    expect(screen.getByText(/Rules: Discount Over 15%/i)).toBeInTheDocument();

    const reqBtn = screen.getByRole('button', { name: /Request Approval/i });
    fireEvent.click(reqBtn);
    expect(handleRequestApproval).toHaveBeenCalled();
  });

  it('displays locked estimate banner with revise and supersede actions', () => {
    const handleRevise = vi.fn();
    const handleSupersede = vi.fn();

    const lockedEstimate = {
      ...mockEstimate,
      lifecycle_state: 'accepted',
      locked_reason: 'Estimate was accepted by customer and is immutable.',
    };

    render(
      <ChargesTab
        estimate={lockedEstimate}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
        onRevise={handleRevise}
        onSupersede={handleSupersede}
        isLocked={true}
      />
    );

    expect(screen.getByText('Estimate Locked')).toBeInTheDocument();
    expect(screen.getByText('Estimate was accepted by customer and is immutable.')).toBeInTheDocument();

    const reviseBtn = screen.getByRole('button', { name: /Revise Estimate/i });
    fireEvent.click(reviseBtn);
    expect(handleRevise).toHaveBeenCalled();
  });

  it('edits Job Tariff Rating Inputs and triggers onSaveJobInputs', async () => {
    const handleSaveJobInputs = vi.fn().mockResolvedValue();

    render(
      <ChargesTab
        estimate={mockEstimate}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
        selectedSubJob={mockSubJobs[0]}
        onSaveJobInputs={handleSaveJobInputs}
      />
    );

    expect(screen.getByText('Job Tariff Rating Inputs')).toBeInTheDocument();

    // Change crew size to 4
    const crewInput = screen.getByDisplayValue('3');
    fireEvent.change(crewInput, { target: { value: '4' } });

    // Click Save Inputs & Reprice
    const saveBtn = screen.getByRole('button', { name: /Save Inputs & Reprice/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSaveJobInputs).toHaveBeenCalledWith('1', expect.objectContaining({
        crew_size: 4,
      }));
    });
  });

  it('clears manual hours explicitly and preserves the tariff pricing default', async () => {
    const save = vi.fn().mockResolvedValue();
    render(<ChargesTab estimate={mockEstimate} charges={mockCharges} subJobs={mockSubJobs}
      selectedSubJobId="1" selectedSubJob={mockSubJobs[0]} onSaveJobInputs={save} />);
    fireEvent.change(screen.getByDisplayValue('4.5'), { target: { value: '' } });
    expect(screen.getByLabelText('Moving pricing')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: /Save Inputs & Reprice/i }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('1', expect.objectContaining({
      hours: null, moving_pricing_type: null,
    })));
  });

  it('updates tax exemption with reason and certificate', async () => {
    const handleUpdateTaxExemption = vi.fn().mockResolvedValue();

    render(
      <ChargesTab
        estimate={mockEstimate}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
        onUpdateTaxExemption={handleUpdateTaxExemption}
      />
    );

    // Toggle tax exempt checkbox
    const taxExemptCheck = screen.getByRole('checkbox', { name: /Tax exempt/i });
    fireEvent.click(taxExemptCheck);

    // Fill reason
    const reasonInput = screen.getByPlaceholderText(/e\.g\. Non-profit/i);
    fireEvent.change(reasonInput, { target: { value: 'First Nations Exemption' } });

    // Click Update Tax Exemption
    const updateBtn = screen.getByRole('button', { name: /Update Tax Exemption/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(handleUpdateTaxExemption).toHaveBeenCalledWith({
        tax_exempt: true,
        tax_exemption_reason: 'First Nations Exemption',
        tax_exemption_certificate_number: '',
      });
    });
  });

  it('displays authoritative totals matching the backend estimate', () => {
    render(
      <ChargesTab
        estimate={mockEstimate}
        charges={mockCharges}
        subJobs={mockSubJobs}
        selectedSubJobId="1"
      />
    );

    // Subtotal: 1250.00
    expect(screen.getAllByText('$1,250.00').length).toBeGreaterThan(0);
    // Discount: -100.00
    expect(screen.getAllByText('-$100.00').length).toBeGreaterThan(0);
    // Sales tax: 149.50
    expect(screen.getAllByText('$149.50').length).toBeGreaterThan(0);
    // Grand total: 1299.50
    expect(screen.getAllByText('$1,299.50').length).toBeGreaterThan(0);
  });
});

describe('EstimateChargeModals', () => {
  it('AddChargeModal submits a manual charge payload', () => {
    const handleAddManual = vi.fn();

    render(
      <AddChargeModal
        isOpen={true}
        onClose={vi.fn()}
        onAddManual={handleAddManual}
        plannedSubJobId="1"
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Hoisting Service/i), {
      target: { value: 'Heavy Safe Handling' },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '250.00' },
    });

    const submitBtn = screen.getByRole('button', { name: /Add Manual Charge/i });
    fireEvent.click(submitBtn);

    expect(handleAddManual).toHaveBeenCalledWith(expect.objectContaining({
      source: 'manual',
      name: 'Heavy Safe Handling',
      unit_price: '250.00',
      quantity: '1',
      taxable: true,
      planned_sub_job_id: 1,
    }));
  });

  it('AddChargeModal submits a discount payload', () => {
    const handleAddDiscount = vi.fn();
    const presets = [
      { id: 10, label: 'Military Discount', discount_type: 'percentage', value: '10' },
    ];

    render(
      <AddChargeModal
        isOpen={true}
        onClose={vi.fn()}
        onAddDiscount={handleAddDiscount}
        discountPresets={presets}
        plannedSubJobId="1"
      />
    );

    // Switch to Discount tab
    const discountTab = screen.getByRole('button', { name: /Discount/i });
    fireEvent.click(discountTab);

    // Select preset
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const applyBtn = screen.getByRole('button', { name: /Apply Discount/i });
    fireEvent.click(applyBtn);

    expect(handleAddDiscount).toHaveBeenCalledWith({
      source: 'discount',
      preset_id: 10,
      planned_sub_job_id: 1,
    });
  });

  it('EditChargeModal for tariff line shows override warning and allows saving override', () => {
    const handleSave = vi.fn();
    const tariffCharge = {
      id: 501,
      source_type: 'tariff',
      name: 'Moving Labor',
      quantity: '3',
      unit_price: '150.00',
      taxable: true,
      category: 'labor',
      metadata: { calculated_amount: '400.00' },
      is_manual_override: true,
    };

    render(
      <EditChargeModal
        isOpen={true}
        charge={tariffCharge}
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    expect(screen.getByText('Edit Tariff Line Override')).toBeInTheDocument();
    expect(screen.getByText(/Calculated tariff amount:/i)).toBeInTheDocument();
    expect(screen.getByText(/\$400\.00/)).toBeInTheDocument();

    // Edit price
    const priceInput = screen.getByDisplayValue('150.00');
    fireEvent.change(priceInput, { target: { value: '165.00' } });

    const saveBtn = screen.getByRole('button', { name: /Save Override/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      unit_price: '165.00',
      quantity: '3',
    }));
  });

  it('EditChargeModal provides Restore Tariff Price for overridden tariff lines', () => {
    const handleClearOverride = vi.fn();
    const tariffCharge = {
      id: 501,
      source_type: 'tariff',
      name: 'Moving Labor',
      quantity: '3',
      unit_price: '165.00',
      is_manual_override: true,
      metadata: { calculated_amount: '400.00' },
    };

    render(
      <EditChargeModal
        isOpen={true}
        charge={tariffCharge}
        onClose={vi.fn()}
        onClearOverride={handleClearOverride}
      />
    );

    const restoreBtn = screen.getByRole('button', { name: /Restore Tariff Price/i });
    fireEvent.click(restoreBtn);

    expect(handleClearOverride).toHaveBeenCalled();
  });
});
