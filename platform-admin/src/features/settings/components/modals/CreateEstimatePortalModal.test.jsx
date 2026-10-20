import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateEstimatePortalModal, { ESTIMATE_PORTAL_TYPES } from './CreateEstimatePortalModal';
import { createEstimatePortalTemplate } from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  createEstimatePortalTemplate: vi.fn(),
}));

describe('CreateEstimatePortalModal', () => {
  const branches = [
    { id: 1, name: 'Main Branch' },
    { id: 2, name: 'North Branch' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open with valid backend subtypes', () => {
    render(
      <CreateEstimatePortalModal
        isOpen={true}
        onClose={vi.fn()}
        branches={branches}
        defaultBranchId={1}
      />
    );

    expect(screen.getByText('New Estimate Portal Template')).toBeInTheDocument();
    expect(ESTIMATE_PORTAL_TYPES.map((t) => t.id)).toEqual([
      'binding',
      'non_binding',
      'hourly',
      'flat_rate',
    ]);

    const select = screen.getByRole('combobox', { name: /portal type/i });
    expect(select).toHaveValue('binding');
  });

  it('submits valid subtype and triggers onCreated callback', async () => {
    const onCreated = vi.fn();
    createEstimatePortalTemplate.mockResolvedValue({ id: 101, name: 'Special Moving Estimate' });

    render(
      <CreateEstimatePortalModal
        isOpen={true}
        onClose={vi.fn()}
        onCreated={onCreated}
        branches={branches}
        defaultBranchId={1}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Premium Moving Estimate Portal/i);
    fireEvent.change(nameInput, { target: { value: 'Special Moving Estimate' } });

    const typeSelect = screen.getByRole('combobox', { name: /portal type/i });
    fireEvent.change(typeSelect, { target: { value: 'hourly' } });

    const submitBtn = screen.getByRole('button', { name: /Create & Open Builder/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createEstimatePortalTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Special Moving Estimate',
          subtype: 'hourly',
          template_type: 'hourly',
          branch: 1,
        })
      );
    });

    expect(onCreated).toHaveBeenCalledWith({ id: 101, name: 'Special Moving Estimate' });
  });

  it('displays error message from backend if domain validation fails', async () => {
    createEstimatePortalTemplate.mockRejectedValue({
      response: {
        data: {
          detail: 'subtype must be one of: binding, non_binding, hourly, flat_rate.',
        },
      },
    });

    render(
      <CreateEstimatePortalModal
        isOpen={true}
        onClose={vi.fn()}
        branches={branches}
        defaultBranchId={1}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Create & Open Builder/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('subtype must be one of: binding, non_binding, hourly, flat_rate.')
      ).toBeInTheDocument();
    });
  });
});
