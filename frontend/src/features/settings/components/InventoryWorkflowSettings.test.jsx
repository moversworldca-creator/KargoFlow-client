import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryWorkflowSettings from './InventoryWorkflowSettings';
import * as api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  getInventoryRoomTemplates: vi.fn(),
  createInventoryRoomTemplate: vi.fn(),
  updateInventoryRoomTemplate: vi.fn(),
  deleteInventoryRoomTemplate: vi.fn(),
  getInventoryItemTemplates: vi.fn(),
  createInventoryItemTemplate: vi.fn(),
  updateInventoryItemTemplate: vi.fn(),
  deleteInventoryItemTemplate: vi.fn(),
  getBranches: vi.fn(),
}));

describe('InventoryWorkflowSettings', () => {
  const mockBranches = [
    { id: 1, name: 'Main HQ' },
    { id: 2, name: 'North Branch' },
  ];

  const mockRooms = [
    {
      id: 1,
      name: 'Living Room',
      sort_order: 1,
      is_active: true,
      branch: 1,
      item_templates: [
        { id: 101, name: 'Sofa', weight_lbs_each: 180, sort_order: 1, is_active: true, room_template: 1, branch: 1 },
        { id: 102, name: 'Coffee Table', weight_lbs_each: 40, sort_order: 2, is_active: true, room_template: 1, branch: 1 },
      ],
    },
    {
      id: 2,
      name: 'Kitchen',
      sort_order: 2,
      is_active: false,
      branch: 1,
      item_templates: [
        { id: 201, name: 'Refrigerator', weight_lbs_each: 250, sort_order: 1, is_active: true, room_template: 2, branch: 1 },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getBranches.mockResolvedValue(mockBranches);
    api.getInventoryRoomTemplates.mockResolvedValue(mockRooms);
    api.createInventoryRoomTemplate.mockImplementation((data) =>
      Promise.resolve({ id: 99, ...data, item_templates: [] })
    );
    api.updateInventoryRoomTemplate.mockImplementation((id, data) =>
      Promise.resolve({ id, ...data })
    );
    api.deleteInventoryRoomTemplate.mockResolvedValue({ success: true });
    api.createInventoryItemTemplate.mockImplementation((data) =>
      Promise.resolve({ id: 999, ...data })
    );
    api.updateInventoryItemTemplate.mockImplementation((id, data) =>
      Promise.resolve({ id, ...data })
    );
    api.deleteInventoryItemTemplate.mockResolvedValue({ success: true });
  });

  it('renders inventory templates header, room list, and item helpers', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Inventory Templates & Helpers')).toBeInTheDocument();
      expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
      expect(screen.getByText('Kitchen')).toBeInTheDocument();
      expect(screen.getByText('Sofa')).toBeInTheDocument();
      expect(screen.getByText('180 lbs')).toBeInTheDocument();
      expect(screen.getByText('Coffee Table')).toBeInTheDocument();
    });

    // Check stats badges
    expect(screen.getAllByText((_, element) => element?.textContent === '3 Items').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Seed Presets')).toBeInTheDocument();
  });

  it('allows adding a new room template', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
    });

    const roomInput = screen.getByPlaceholderText(/New room name/i);
    fireEvent.change(roomInput, { target: { value: 'Master Bedroom' } });

    const addRoomBtn = screen.getByRole('button', { name: /^Add$/i });
    fireEvent.click(addRoomBtn);

    await waitFor(() => {
      expect(api.createInventoryRoomTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Master Bedroom',
          sort_order: 3,
          is_active: true,
          branch: 1,
        })
      );
    });
  });

  it('allows adding a new item template to selected room', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
    });

    const itemNameInput = screen.getByPlaceholderText(/Add item to Living Room/i);
    const itemWeightInput = screen.getByLabelText(/Item weight in pounds/i);

    fireEvent.change(itemNameInput, { target: { value: 'Bookshelf' } });
    fireEvent.change(itemWeightInput, { target: { value: '70' } });

    const addItemBtn = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addItemBtn);

    await waitFor(() => {
      expect(api.createInventoryItemTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Bookshelf',
          weight_lbs_each: 70,
          room_template: 1,
          is_active: true,
          branch: 1,
        })
      );
    });
  });

  it('allows toggling item active status directly with optimistic update', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Sofa')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /Toggle active status for Sofa/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(api.updateInventoryItemTemplate).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          is_active: false,
        })
      );
    });
  });

  it('allows editing room details in modal', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
    });

    const editRoomBtn = screen.getByLabelText('Edit Living Room');
    fireEvent.click(editRoomBtn);

    expect(screen.getByText('Edit Room Details')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Living Room');
    fireEvent.change(nameInput, { target: { value: 'Main Living Room' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateInventoryRoomTemplate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Main Living Room',
        })
      );
    });
  });

  it('allows editing item details in modal', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Sofa')).toBeInTheDocument();
    });

    const editItemBtn = screen.getByLabelText('Edit Sofa');
    fireEvent.click(editItemBtn);

    expect(screen.getByText('Edit Item Details')).toBeInTheDocument();

    const weightInput = screen.getByDisplayValue('180');
    fireEvent.change(weightInput, { target: { value: '195' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateInventoryItemTemplate).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          weight_lbs_each: 195,
        })
      );
    });
  });

  it('allows deleting an item with confirmation modal', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Coffee Table')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText('Delete Coffee Table');
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Delete Item\?/i)).toBeInTheDocument();
    expect(screen.getByText(/"Coffee Table"/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.deleteInventoryItemTemplate).toHaveBeenCalledWith(102);
    });
  });

  it('allows seeding default helpers after confirmation', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Seed Presets')).toBeInTheDocument();
    });

    const seedBtn = screen.getByText('Seed Presets');
    fireEvent.click(seedBtn);

    expect(screen.getByText(/Seed Default Inventory Helpers/i)).toBeInTheDocument();

    const confirmSeedBtn = screen.getByRole('button', { name: /seed presets now/i });
    fireEvent.click(confirmSeedBtn);

    await waitFor(() => {
      // Deletes existing rooms and creates new ones
      expect(api.deleteInventoryRoomTemplate).toHaveBeenCalled();
      expect(api.createInventoryRoomTemplate).toHaveBeenCalled();
      expect(api.createInventoryItemTemplate).toHaveBeenCalled();
    });
  });

  it('switches rooms when clicking another room card', async () => {
    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
      expect(screen.getByText('Kitchen')).toBeInTheDocument();
    });

    // Currently Living Room is selected, showing Sofa
    expect(screen.getByText('Sofa')).toBeInTheDocument();

    // Click on Kitchen
    fireEvent.click(screen.getByText('Kitchen'));

    await waitFor(() => {
      expect(screen.getByText('Refrigerator')).toBeInTheDocument();
      expect(screen.getAllByText('250 lbs').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Sofa')).not.toBeInTheDocument();
    });
  });

  it('displays contiguous sequential sort order (#1, #2, ...) without gaps', async () => {
    api.getInventoryRoomTemplates.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Living Room',
        sort_order: 2,
        is_active: true,
        branch: 1,
        item_templates: [
          { id: 101, name: 'Sofa', weight_lbs_each: 180, sort_order: 2, is_active: true, room_template: 1, branch: 1 },
          { id: 102, name: 'Coffee Table', weight_lbs_each: 40, sort_order: 5, is_active: true, room_template: 1, branch: 1 },
        ],
      },
    ]);

    render(<InventoryWorkflowSettings branchId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Sofa')).toBeInTheDocument();
      expect(screen.getByText('Coffee Table')).toBeInTheDocument();
    });

    // Sofa is re-indexed to #1 and Coffee Table to #2
    expect(screen.getAllByText('#1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});

