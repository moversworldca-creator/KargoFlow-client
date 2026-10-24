import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../../services/axios';
import {
  getInventoryRoomTemplates,
  createInventoryRoomTemplate,
  updateInventoryRoomTemplate,
  deleteInventoryRoomTemplate,
  getInventoryItemTemplates,
  createInventoryItemTemplate,
  updateInventoryItemTemplate,
  deleteInventoryItemTemplate,
  getInventoryRoomLookups,
  getInventoryItemLookups,
} from '../../../services/api';

vi.mock('../../../services/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Inventory Backend API Integration (api.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches rooms from /tenant/rooms/ and items from /tenant/inventory/ and nests them', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tenant/rooms/') {
        return Promise.resolve([
          {
            id: 1,
            data: { id: 1, name: 'Living Room', sort_order: 1, is_active: true, branch_id: 10 },
          },
          {
            id: 2,
            data: { id: 2, name: 'Kitchen', sort_order: 2, is_active: true, branch_id: 10 },
          },
        ]);
      }
      if (url === '/tenant/inventory/') {
        return Promise.resolve([
          {
            id: 101,
            data: {
              id: 101,
              room_template_id: 1,
              name: 'Sofa',
              weight_lbs_each: '180.00',
              sort_order: 1,
              is_active: true,
              branch_id: 10,
            },
          },
          {
            id: 102,
            data: {
              id: 102,
              room_template_id: 1,
              name: 'Coffee Table',
              weight_lbs_each: '45.00',
              sort_order: 2,
              is_active: true,
              branch_id: 10,
            },
          },
          {
            id: 201,
            data: {
              id: 201,
              room_template_id: 2,
              name: 'Fridge',
              weight_lbs_each: '220.00',
              sort_order: 1,
              is_active: true,
              branch_id: 10,
            },
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected GET url: ${url}`));
    });

    const rooms = await getInventoryRoomTemplates({ branch: 10 });

    expect(api.get).toHaveBeenCalledWith('/tenant/rooms/', {
      params: expect.objectContaining({ applicable_branch_id: 10, limit: 100 }),
    });
    expect(api.get).toHaveBeenCalledWith('/tenant/inventory/', {
      params: expect.objectContaining({ applicable_branch_id: 10, limit: 100 }),
    });

    expect(rooms).toHaveLength(2);
    expect(rooms[0].name).toBe('Living Room');
    expect(rooms[0].sort_order).toBe(1);
    expect(rooms[0].item_templates).toHaveLength(2);
    expect(rooms[0].item_templates[0].name).toBe('Sofa');
    expect(rooms[0].item_templates[0].sort_order).toBe(1);
    expect(rooms[0].item_templates[0].weight_lbs_each).toBe(180);
    expect(rooms[0].item_templates[0].room_template).toBe(1);
    expect(rooms[0].item_templates[0].room_template_id).toBe(1);

    expect(rooms[1].name).toBe('Kitchen');
    expect(rooms[1].item_templates).toHaveLength(1);
    expect(rooms[1].item_templates[0].name).toBe('Fridge');
    expect(rooms[1].item_templates[0].sort_order).toBe(1);
  });

  it('creates room template via POST /tenant/rooms/', async () => {
    api.post.mockResolvedValue({
      id: 5,
      data: {
        id: 5,
        name: 'Patio',
        sort_order: 3,
        is_active: true,
        branch_id: 2,
      },
    });

    const result = await createInventoryRoomTemplate({
      name: 'Patio',
      sort_order: 3,
      is_active: true,
      branch_id: 2,
    });

    expect(api.post).toHaveBeenCalledWith('/tenant/rooms/', {
      name: 'Patio',
      sort_order: 3,
      is_active: true,
      branch_id: 2,
    });
    expect(result.id).toBe(5);
    expect(result.name).toBe('Patio');
    expect(result.branch).toBe(2);
    expect(result.branch_id).toBe(2);
  });

  it('updates room template via PATCH /tenant/rooms/<id>/', async () => {
    api.patch.mockResolvedValue({
      id: 5,
      data: {
        id: 5,
        name: 'Backyard Patio',
        sort_order: 4,
        is_active: false,
        branch_id: 2,
      },
    });

    const result = await updateInventoryRoomTemplate(5, {
      name: 'Backyard Patio',
      sort_order: 4,
      is_active: false,
      branch: 2,
    });

    expect(api.patch).toHaveBeenCalledWith('/tenant/rooms/5/', {
      name: 'Backyard Patio',
      sort_order: 4,
      is_active: false,
      branch_id: 2,
    });
    expect(result.name).toBe('Backyard Patio');
    expect(result.is_active).toBe(false);
  });

  it('deletes child items before deleting room via DELETE /tenant/rooms/<id>/', async () => {
    api.get.mockResolvedValue([
      { id: 501, data: { id: 501, name: 'Chair' } },
      { id: 502, data: { id: 502, name: 'Grill' } },
    ]);
    api.delete.mockResolvedValue({});

    const result = await deleteInventoryRoomTemplate(5);

    expect(api.get).toHaveBeenCalledWith('/tenant/inventory/', {
      params: { room_template_id: 5, limit: 100 },
    });
    expect(api.delete).toHaveBeenCalledWith('/tenant/inventory/501/');
    expect(api.delete).toHaveBeenCalledWith('/tenant/inventory/502/');
    expect(api.delete).toHaveBeenCalledWith('/tenant/rooms/5/');
    expect(result).toEqual({ success: true });
  });

  it('creates inventory item template via POST /tenant/inventory/', async () => {
    api.post.mockResolvedValue({
      id: 110,
      data: {
        id: 110,
        room_template_id: 1,
        name: 'Armchair',
        weight_lbs_each: '60.00',
        sort_order: 3,
        is_active: true,
        branch_id: 1,
      },
    });

    const result = await createInventoryItemTemplate({
      room_template: 1,
      name: 'Armchair',
      weight_lbs_each: 60,
      sort_order: 3,
      is_active: true,
      branch: 1,
    });

    expect(api.post).toHaveBeenCalledWith('/tenant/inventory/', {
      name: 'Armchair',
      room_template_id: 1,
      weight_lbs_each: 60,
      sort_order: 3,
      is_active: true,
      branch_id: 1,
    });
    expect(result.id).toBe(110);
    expect(result.room_template).toBe(1);
    expect(result.room_template_id).toBe(1);
    expect(result.weight_lbs_each).toBe(60);
  });

  it('updates inventory item template via PATCH /tenant/inventory/<id>/', async () => {
    api.patch.mockResolvedValue({
      id: 110,
      data: {
        id: 110,
        room_template_id: 1,
        name: 'Recliner Armchair',
        weight_lbs_each: '85.00',
        sort_order: 3,
        is_active: true,
        branch_id: 1,
      },
    });

    const result = await updateInventoryItemTemplate(110, {
      name: 'Recliner Armchair',
      weight_lbs_each: 85,
    });

    expect(api.patch).toHaveBeenCalledWith('/tenant/inventory/110/', {
      name: 'Recliner Armchair',
      weight_lbs_each: 85,
    });
    expect(result.name).toBe('Recliner Armchair');
    expect(result.weight_lbs_each).toBe(85);
  });

  it('deletes inventory item template via DELETE /tenant/inventory/<id>/', async () => {
    api.delete.mockResolvedValue({});
    const result = await deleteInventoryItemTemplate(110);

    expect(api.delete).toHaveBeenCalledWith('/tenant/inventory/110/');
    expect(result).toEqual({ success: true });
  });

  it('supports lookup endpoints for rooms and inventory items', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tenant/rooms/lookup/') {
        return Promise.resolve([
          { id: 1, name: 'Living Room' },
          { id: 2, name: 'Bedroom' },
        ]);
      }
      if (url === '/tenant/inventory/lookup/') {
        return Promise.resolve([
          { id: 101, name: 'Sofa' },
          { id: 102, name: 'Bed' },
        ]);
      }
      return Promise.reject(new Error(`Unexpected lookup url: ${url}`));
    });

    const roomLookups = await getInventoryRoomLookups();
    const itemLookups = await getInventoryItemLookups();

    expect(roomLookups).toEqual([
      { id: 1, name: 'Living Room' },
      { id: 2, name: 'Bedroom' },
    ]);
    expect(itemLookups).toEqual([
      { id: 101, name: 'Sofa' },
      { id: 102, name: 'Bed' },
    ]);
  });
});
