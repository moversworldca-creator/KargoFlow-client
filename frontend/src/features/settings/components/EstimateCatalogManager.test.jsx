import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EstimateCatalogManager from './EstimateCatalogManager';
import {
  createEstimateCatalogItem,
  deactivateEstimateCatalogItem,
  getBranches,
  getEstimateCatalogItems,
  updateEstimateCatalogItem,
} from '../../../services/api';

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, branch_id: 1 } }),
}));

vi.mock('../../../services/api', () => ({
  createEstimateCatalogItem: vi.fn(),
  deactivateEstimateCatalogItem: vi.fn(),
  getBranches: vi.fn(),
  getEstimateCatalogItems: vi.fn(),
  updateEstimateCatalogItem: vi.fn(),
}));

const branch = { id: 1, name: 'Main Branch' };

const baseCatalogItem = {
  id: 11,
  branch: 1,
  code: 'BOX',
  name: 'Medium Box',
  description: 'Starter box',
  item_type: 'materials',
  category: 'materials',
  unit: 'each',
  default_quantity: '2.000',
  default_unit_price: '5.00',
  taxable: true,
  is_active: true,
  is_customer_visible: true,
  is_optional_by_default: false,
  display_order: 0,
  metadata: {
    currency: 'USD',
    pricing_model: 'fixed',
    cost_per_unit: '0.00',
    tax_rate: '0',
  },
};

const getNameInput = () => screen.getByPlaceholderText('e.g. 2 Movers & 1 Truck');

const getModal = () => screen.getByRole('heading', { name: /catalog product/i }).closest('.fixed');

const getRateInput = () => {
  const modal = screen.getByRole('heading', { name: /catalog product/i }).closest('.fixed');
  return within(modal).getByDisplayValue('0.00');
};

describe('EstimateCatalogManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBranches.mockResolvedValue([branch]);
    getEstimateCatalogItems.mockResolvedValue([]);
    createEstimateCatalogItem.mockResolvedValue({ id: 12 });
    updateEstimateCatalogItem.mockResolvedValue({});
    deactivateEstimateCatalogItem.mockResolvedValue({});
  });

  it('lets a tester create, edit, and deactivate catalog items from settings', async () => {
    getEstimateCatalogItems
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...baseCatalogItem, id: 12, name: 'Packing Paper', default_unit_price: '12.50' }])
      .mockResolvedValueOnce([{ ...baseCatalogItem, id: 12, name: 'Packing Paper Plus', default_unit_price: '15.00' }])
      .mockResolvedValueOnce([]);

    render(<EstimateCatalogManager branchId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: /add product/i }));
    fireEvent.change(getNameInput(), { target: { value: 'Packing Paper' } });
    fireEvent.change(getRateInput(), { target: { value: '12.50' } });
    fireEvent.click(within(getModal()).getByRole('button', { name: /^add product$/i }));

    await waitFor(() => {
      expect(createEstimateCatalogItem).toHaveBeenCalledWith(expect.objectContaining({
        branch: 1,
        name: 'Packing Paper',
        default_unit_price: '12.50',
        is_active: true,
      }));
    });
    expect(await screen.findByText('Catalog item created.')).toBeInTheDocument();
    expect(await screen.findByText(/Packing Paper/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.change(getNameInput(), { target: { value: 'Packing Paper Plus' } });
    fireEvent.change(screen.getByDisplayValue('12.50'), { target: { value: '15.00' } });
    fireEvent.click(within(getModal()).getByRole('button', { name: /save product/i }));

    await waitFor(() => {
      expect(updateEstimateCatalogItem).toHaveBeenCalledWith(12, expect.objectContaining({
        branch: 1,
        name: 'Packing Paper Plus',
        default_unit_price: '15.00',
      }));
    });
    expect(await screen.findByText('Catalog item updated.')).toBeInTheDocument();
    expect(await screen.findByText(/Packing Paper Plus/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));

    await waitFor(() => {
      expect(deactivateEstimateCatalogItem).toHaveBeenCalledWith(12);
    });
    expect(await screen.findByText('Catalog item deactivated.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Packing Paper Plus/i)).not.toBeInTheDocument();
    });
  });
});
