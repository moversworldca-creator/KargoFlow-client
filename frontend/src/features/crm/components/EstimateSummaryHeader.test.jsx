import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EstimateSummaryHeader, {
  getEstimatePricingStatus,
  formatBindingType,
  fmtMoney,
} from './EstimateSummaryHeader';

describe('EstimateSummaryHeader Component', () => {
  const baseEstimate = {
    id: 101,
    estimate_number: '1004',
    lifecycle_state: 'draft',
    lifecycle_label: 'Draft',
    grand_total: '4520.00',
    binding_type: 'non_binding',
    not_to_exceed_amount: null,
    not_to_exceed_is_manual: false,
    tariff_id: 5,
    calculation_trace: {
      tariff_name: 'Local Moving',
    },
    inventory: {
      volume_cuft: '1200.00',
      weight_lbs: '8400.00',
    },
    charges: [
      { id: 1, name: 'Moving Labor', total_price: '4000.00', is_manual_override: false },
      { id: 2, name: 'Travel Fee', total_price: '520.00', is_manual_override: false },
    ],
    repricing: { needed: false, reasons: [] },
    locked_reason: null,
  };

  const baseOpportunity = {
    id: 42,
    customer_name: 'Chery Medel',
    service_type_name: 'Local Moving',
  };

  it('renders Current state with authoritative grand total, tariff, binding, NTE and volume/weight', () => {
    const onPreview = vi.fn();
    const onRecalculate = vi.fn();
    const onSend = vi.fn();

    render(
      <EstimateSummaryHeader
        estimate={baseEstimate}
        opportunity={baseOpportunity}
        onPreview={onPreview}
        onRecalculate={onRecalculate}
        onSend={onSend}
      />
    );

    // Authoritative grand total
    expect(screen.getByTestId('estimate-grand-total')).toHaveTextContent('$4,520.00');

    // Pricing status badge
    const statusBadge = screen.getByTestId('estimate-pricing-status');
    expect(statusBadge).toHaveTextContent('Current');

    // Identity and lifecycle
    expect(screen.getByTestId('estimate-number')).toHaveTextContent('#1004');
    expect(screen.getByTestId('estimate-lifecycle-badge')).toHaveTextContent('Draft');
    expect(screen.getByTestId('estimate-customer-summary')).toHaveTextContent('Chery Medel · Local Moving');

    // Tariff, Binding, NTE, Volume & Weight
    expect(screen.getByTestId('estimate-tariff-name')).toHaveTextContent('Local Moving');
    expect(screen.getByTestId('estimate-binding-type')).toHaveTextContent('Non-Binding');
    expect(screen.getByTestId('estimate-nte-amount')).toHaveTextContent('Not configured');
    expect(screen.getByTestId('estimate-volume-weight')).toHaveTextContent('1,200 cu ft · 8,400 lbs');

    // Action buttons are active and trigger callbacks
    const previewBtn = screen.getByTestId('action-preview-estimate');
    const recalcBtn = screen.getByTestId('action-recalculate-estimate');
    const sendBtn = screen.getByTestId('action-send-estimate');

    expect(previewBtn).not.toBeDisabled();
    expect(recalcBtn).not.toBeDisabled();
    expect(sendBtn).not.toBeDisabled();

    fireEvent.click(previewBtn);
    expect(onPreview).toHaveBeenCalledTimes(1);

    fireEvent.click(recalcBtn);
    expect(onRecalculate).toHaveBeenCalledTimes(1);

    fireEvent.click(sendBtn);
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('renders Repricing Required state distinctly and enables recalculation', () => {
    const onRecalculate = vi.fn();
    const repricingEstimate = {
      ...baseEstimate,
      repricing: {
        needed: true,
        reasons: ['tariff_updated', 'materials_changed'],
      },
    };

    render(
      <EstimateSummaryHeader
        estimate={repricingEstimate}
        opportunity={baseOpportunity}
        onRecalculate={onRecalculate}
      />
    );

    const statusBadge = screen.getByTestId('estimate-pricing-status');
    expect(statusBadge).toHaveTextContent('Repricing Required');

    const recalcBtn = screen.getByTestId('action-recalculate-estimate');
    expect(recalcBtn).not.toBeDisabled();

    fireEvent.click(recalcBtn);
    expect(onRecalculate).toHaveBeenCalledTimes(1);
  });

  it('renders Locked state when estimate is locked or opportunity is locked', () => {
    const onRecalculate = vi.fn();
    const onSend = vi.fn();

    const lockedEstimate = {
      ...baseEstimate,
      lifecycle_state: 'accepted',
      lifecycle_label: 'Accepted',
      locked_reason: 'booked',
    };

    render(
      <EstimateSummaryHeader
        estimate={lockedEstimate}
        opportunity={baseOpportunity}
        isOpportunityLocked={true}
        onRecalculate={onRecalculate}
        onSend={onSend}
      />
    );

    const statusBadge = screen.getByTestId('estimate-pricing-status');
    expect(statusBadge).toHaveTextContent(/Locked/i);

    // Actions should be disabled in locked state
    const recalcBtn = screen.getByTestId('action-recalculate-estimate');
    const sendBtn = screen.getByTestId('action-send-estimate');
    expect(recalcBtn).toBeDisabled();
    expect(sendBtn).toBeDisabled();

    // Preview remains available even when locked
    const previewBtn = screen.getByTestId('action-preview-estimate');
    expect(previewBtn).not.toBeDisabled();
  });

  it('renders Overridden status when charges or NTE are manual overrides', () => {
    const overriddenEstimate = {
      ...baseEstimate,
      not_to_exceed_amount: '5000.00',
      not_to_exceed_is_manual: true,
      charges: [
        { id: 1, name: 'Moving Labor', total_price: '4000.00', is_manual_override: true },
      ],
    };

    render(
      <EstimateSummaryHeader
        estimate={overriddenEstimate}
        opportunity={baseOpportunity}
      />
    );

    const statusBadge = screen.getByTestId('estimate-pricing-status');
    expect(statusBadge).toHaveTextContent('Overridden');
    expect(screen.getByTestId('estimate-nte-amount')).toHaveTextContent('$5,000.00');
  });

  it('renders Incomplete status when there are no charge lines', () => {
    const incompleteEstimate = {
      ...baseEstimate,
      charges: [],
    };

    render(
      <EstimateSummaryHeader
        estimate={incompleteEstimate}
        opportunity={baseOpportunity}
      />
    );

    const statusBadge = screen.getByTestId('estimate-pricing-status');
    expect(statusBadge).toHaveTextContent('Incomplete');
  });

  it('disables actions when user lacks edit permissions', () => {
    render(
      <EstimateSummaryHeader
        estimate={baseEstimate}
        opportunity={baseOpportunity}
        canEditOpportunity={false}
        canSendEmail={false}
      />
    );

    expect(screen.getByTestId('action-recalculate-estimate')).toBeDisabled();
    expect(screen.getByTestId('action-send-estimate')).toBeDisabled();
    expect(screen.getByTestId('action-preview-estimate')).not.toBeDisabled();
  });

  it('shows busy state during recalculation', () => {
    render(
      <EstimateSummaryHeader
        estimate={baseEstimate}
        opportunity={baseOpportunity}
        isRecalculating={true}
      />
    );

    const recalcBtn = screen.getByTestId('action-recalculate-estimate');
    expect(recalcBtn).toHaveTextContent('Recalculating…');
    expect(recalcBtn).toBeDisabled();
  });

  it('omits profit when trusted backend data is absent', () => {
    render(
      <EstimateSummaryHeader
        estimate={baseEstimate}
        opportunity={baseOpportunity}
      />
    );

    expect(screen.queryByTestId('estimate-profit')).toBeNull();
  });

  it('displays profit when authoritative backend profit data is present', () => {
    const profitEstimate = {
      ...baseEstimate,
      estimated_profit: '850.00',
      profit_margin: '18.8',
    };

    render(
      <EstimateSummaryHeader
        estimate={profitEstimate}
        opportunity={baseOpportunity}
      />
    );

    const profitElement = screen.getByTestId('estimate-profit');
    expect(profitElement).toBeInTheDocument();
    expect(profitElement).toHaveTextContent('$850.00 (18.8%)');
  });
});

describe('getEstimatePricingStatus Helper', () => {
  it('identifies incomplete estimate when null or empty charges', () => {
    expect(getEstimatePricingStatus(null).status).toBe('Incomplete');
    expect(getEstimatePricingStatus({ id: 1, charges: [] }).status).toBe('Incomplete');
  });

  it('prioritizes locked state over repricing and overrides', () => {
    const est = {
      id: 1,
      locked_reason: 'booked',
      repricing: { needed: true },
      charges: [{ is_manual_override: true }],
    };
    expect(getEstimatePricingStatus(est).status).toBe('Locked');
  });

  it('identifies repricing required before overrides and current', () => {
    const est = {
      id: 1,
      charges: [{ id: 10 }],
      repricing: { needed: true, reasons: ['tariff_updated'] },
    };
    expect(getEstimatePricingStatus(est).status).toBe('Repricing Required');
  });

  it('identifies overridden when any charge has is_manual_override', () => {
    const est = {
      id: 1,
      charges: [{ id: 10, is_manual_override: true }],
      repricing: { needed: false },
    };
    expect(getEstimatePricingStatus(est).status).toBe('Overridden');
  });

  it('returns current when priced with no lock, repricing or overrides', () => {
    const est = {
      id: 1,
      charges: [{ id: 10, is_manual_override: false }],
      repricing: { needed: false },
    };
    expect(getEstimatePricingStatus(est).status).toBe('Current');
  });
});

describe('formatBindingType Helper', () => {
  it('formats known binding types correctly', () => {
    expect(formatBindingType('binding')).toBe('Binding');
    expect(formatBindingType('non_binding')).toBe('Non-Binding');
    expect(formatBindingType('not_to_exceed')).toBe('Not-to-Exceed');
    expect(formatBindingType('nte')).toBe('Not-to-Exceed');
    expect(formatBindingType('hourly')).toBe('Hourly Rate');
    expect(formatBindingType(null)).toBe('Non-Binding');
  });
});

describe('fmtMoney Helper', () => {
  it('formats currency authoritative amounts', () => {
    expect(fmtMoney('4520.00')).toBe('$4,520.00');
    expect(fmtMoney(0)).toBe('$0.00');
    expect(fmtMoney(-150.5)).toBe('−$150.50');
  });
});
