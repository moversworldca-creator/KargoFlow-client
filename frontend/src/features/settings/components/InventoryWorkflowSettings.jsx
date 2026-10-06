import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Package,
  PencilLine,
  Plus,
  Save,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';

import Card from '../../../shared/ui/Card';
import {
  createInventoryItemTemplate,
  createInventoryRoomTemplate,
  deleteInventoryItemTemplate,
  deleteInventoryRoomTemplate,
  getInventoryRoomTemplates,
  updateInventoryItemTemplate,
  updateInventoryRoomTemplate,
  getBranches,
} from '../../../services/api';

const inputCls =
  'w-full rounded-xl border border-[#d9e7f2] bg-white px-3 py-2 text-sm text-[#111d23] outline-none focus:border-[#00513f]/35 focus:ring-2 focus:ring-[#00513f]/10';

const seededInventoryRooms = [
  {
    name: 'Living Room',
    items: [
      { name: 'Sofa', weight_lbs_each: 180 },
      { name: 'Loveseat', weight_lbs_each: 120 },
      { name: 'Coffee Table', weight_lbs_each: 40 },
      { name: 'TV Stand', weight_lbs_each: 60 },
      { name: 'Television', weight_lbs_each: 35 },
      { name: 'Side Table', weight_lbs_each: 25 },
      { name: 'Bookshelf', weight_lbs_each: 70 },
      { name: 'Lamp', weight_lbs_each: 10 },
    ],
  },
  {
    name: 'Bedroom',
    items: [
      { name: 'Queen Bed', weight_lbs_each: 160 },
      { name: 'King Bed', weight_lbs_each: 200 },
      { name: 'Mattress', weight_lbs_each: 90 },
      { name: 'Dresser', weight_lbs_each: 140 },
      { name: 'Nightstand', weight_lbs_each: 35 },
      { name: 'Mirror', weight_lbs_each: 25 },
      { name: 'Chest', weight_lbs_each: 90 },
    ],
  },
  {
    name: 'Kitchen',
    items: [
      { name: 'Dining Table', weight_lbs_each: 120 },
      { name: 'Dining Chair', weight_lbs_each: 20 },
      { name: 'Refrigerator', weight_lbs_each: 250 },
      { name: 'Microwave', weight_lbs_each: 30 },
      { name: 'Kitchen Boxes', weight_lbs_each: 35 },
    ],
  },
  {
    name: 'Dining Room',
    items: [
      { name: 'China Cabinet', weight_lbs_each: 220 },
      { name: 'Buffet', weight_lbs_each: 160 },
      { name: 'Dining Table', weight_lbs_each: 120 },
      { name: 'Dining Chair', weight_lbs_each: 20 },
    ],
  },
  {
    name: 'Office',
    items: [
      { name: 'Desk', weight_lbs_each: 120 },
      { name: 'Office Chair', weight_lbs_each: 35 },
      { name: 'Filing Cabinet', weight_lbs_each: 90 },
      { name: 'Monitor', weight_lbs_each: 15 },
      { name: 'Printer', weight_lbs_each: 25 },
      { name: 'Bookshelf', weight_lbs_each: 70 },
    ],
  },
  {
    name: 'Garage',
    items: [
      { name: 'Tool Chest', weight_lbs_each: 180 },
      { name: 'Work Bench', weight_lbs_each: 140 },
      { name: 'Bike', weight_lbs_each: 35 },
      { name: 'Ladder', weight_lbs_each: 25 },
      { name: 'Storage Bins', weight_lbs_each: 20 },
    ],
  },
  {
    name: 'Storage',
    items: [
      { name: 'Wardrobe Boxes', weight_lbs_each: 45 },
      { name: 'Totes', weight_lbs_each: 30 },
      { name: 'Seasonal Items', weight_lbs_each: 35 },
      { name: 'Misc Boxes', weight_lbs_each: 35 },
    ],
  },
];

const extractRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const InventoryWorkflowSettings = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newRoomName, setNewRoomName] = useState('');
  const [newItemsByRoom, setNewItemsByRoom] = useState({});
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || rooms[0] || null,
    [rooms, selectedRoomId]
  );

  const editingItem = useMemo(() => {
    if (!selectedRoom || !editingItemId) return null;
    return (selectedRoom.item_templates || []).find((i) => i.id === editingItemId);
  }, [selectedRoom, editingItemId]);

  const activeRoomCount = useMemo(() => rooms.filter((room) => room.is_active !== false).length, [rooms]);
  const totalItemCount = useMemo(
    () => rooms.reduce((sum, room) => sum + (room.item_templates || []).filter((item) => item.is_active !== false).length, 0),
    [rooms]
  );

  const setFlash = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const loadRooms = async () => {
    setLoading(true);
    try {
      const params = {};
      if (branchFilter) params.branch = branchFilter;
      const response = await getInventoryRoomTemplates(params);
      const rows = extractRows(response);
      setRooms(rows);
      setSelectedRoomId((current) => {
        if (rows.some((room) => room.id === current)) return current;
        return rows[0]?.id || null;
      });
    } catch {
      setFlash('error', 'Failed to load inventory helpers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [branchFilter]);

  useEffect(() => {
    (async () => {
      try {
        const response = await getBranches();
        const rows = extractRows(response);
        setBranches(rows);
        if (!branchFilter && rows.length) setBranchFilter(String(rows[0].id));
      } catch {
        setBranches([]);
      }
    })();
  }, [branchFilter]);

  const handleAddRoom = async () => {
    const name = newRoomName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await createInventoryRoomTemplate({
        branch: branchFilter ? Number(branchFilter) : null,
        name,
        sort_order: rooms.length + 1,
        is_active: true,
      });
      setNewRoomName('');
      await loadRooms();
      setSelectedRoomId(created.id);
      setFlash('success', 'Room helper added.');
    } catch (err) {
      setFlash('error', err?.response?.data?.name?.[0] || 'Failed to add room helper.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoomChange = (roomId, field, value) => {
    setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, [field]: value } : room)));
  };

  const handleItemChange = (roomId, itemId, field, value) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id !== roomId
          ? room
          : {
              ...room,
              item_templates: (room.item_templates || []).map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item
              ),
            }
      )
    );
  };

  const saveRoom = async (room) => {
    if (!room) return;
    setSaving(true);
    try {
      await updateInventoryRoomTemplate(room.id, {
        branch: room.branch || null,
        name: String(room.name || '').trim(),
        sort_order: room.sort_order || 0,
        is_active: room.is_active !== false,
      });
      await loadRooms();
      setFlash('success', 'Room helper saved.');
    } catch (err) {
      setFlash('error', err?.response?.data?.name?.[0] || 'Failed to save room helper.');
    } finally {
      setSaving(false);
    }
  };

  const removeRoom = async (roomId) => {
    setSaving(true);
    try {
      await deleteInventoryRoomTemplate(roomId);
      await loadRooms();
      setFlash('success', 'Room helper removed.');
    } catch {
      setFlash('error', 'Failed to remove room helper.');
    } finally {
      setSaving(false);
    }
  };

  const addItemToRoom = async (room) => {
    const name = String(newItemsByRoom[room.id] || '').trim();
    if (!name) return;
    setSaving(true);
    try {
      await createInventoryItemTemplate({
        branch: room.branch || null,
        room_template: room.id,
        name,
        weight_lbs_each: 0,
        sort_order: (room.item_templates || []).length + 1,
        is_active: true,
      });
      setNewItemsByRoom((prev) => ({ ...prev, [room.id]: '' }));
      await loadRooms();
      setSelectedRoomId(room.id);
      setFlash('success', 'Item helper added.');
    } catch (err) {
      setFlash('error', err?.response?.data?.name?.[0] || 'Failed to add item helper.');
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async (item) => {
    setSaving(true);
    try {
      await updateInventoryItemTemplate(item.id, {
        branch: item.branch || null,
        room_template: item.room_template,
        name: String(item.name || '').trim(),
        weight_lbs_each: item.weight_lbs_each === '' ? 0 : Number(item.weight_lbs_each || 0),
        sort_order: item.sort_order || 0,
        is_active: item.is_active !== false,
      });
      await loadRooms();
      setFlash('success', 'Item helper saved.');
    } catch (err) {
      setFlash('error', err?.response?.data?.name?.[0] || 'Failed to save item helper.');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (itemId) => {
    setSaving(true);
    try {
      await deleteInventoryItemTemplate(itemId);
      await loadRooms();
      setFlash('success', 'Item helper removed.');
    } catch {
      setFlash('error', 'Failed to remove item helper.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedInventoryHelpers = async () => {
    setSaving(true);
    try {
      const params = {};
      if (branchFilter) params.branch = branchFilter;
      const currentRooms = extractRows(await getInventoryRoomTemplates(params));

      for (const room of currentRooms) {
        for (const item of room.item_templates || []) {
          await deleteInventoryItemTemplate(item.id);
        }
      }

      for (const room of currentRooms) {
        await deleteInventoryRoomTemplate(room.id);
      }

      for (const [roomIndex, roomSeed] of seededInventoryRooms.entries()) {
        const createdRoom = await createInventoryRoomTemplate({
          branch: branchFilter ? Number(branchFilter) : null,
          name: roomSeed.name,
          sort_order: roomIndex + 1,
          is_active: true,
        });

        for (const [itemIndex, itemSeed] of roomSeed.items.entries()) {
          await createInventoryItemTemplate({
            branch: branchFilter ? Number(branchFilter) : null,
            room_template: createdRoom.id,
            name: itemSeed.name,
            weight_lbs_each: itemSeed.weight_lbs_each ?? 0,
            sort_order: itemIndex + 1,
            is_active: true,
          });
        }
      }

      await loadRooms();
      setFlash('success', 'Inventory helpers seeded.');
    } catch {
      setFlash('error', 'Failed to seed inventory helpers.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-[#60727b]">
        <Loader2 className="mr-3 animate-spin" size={18} />
        Loading inventory helpers...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="rounded-[2rem] border border-[#dce8f1] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#edf8f4] text-[#00513f]">
              <Package size={18} />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-[#111d23]">Inventory Helpers</h3>
              <p className="text-sm text-[#60727b]">
                Organize room templates and reusable item lists for the estimate inventory portal.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-xl border border-[#dce8f1] bg-white px-3 py-2 text-sm font-bold text-[#111d23] outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] px-4 py-3 text-sm text-[#506169]">
              <span className="font-bold text-[#111d23]">{activeRoomCount}</span> active rooms
            </div>
            <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] px-4 py-3 text-sm text-[#506169]">
              <span className="font-bold text-[#111d23]">{totalItemCount}</span> active items
            </div>
            <button
              type="button"
              onClick={handleSeedInventoryHelpers}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dce8f1] bg-white px-4 py-2 text-sm font-bold text-[#111d23] disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
              Seed Helpers
            </button>
          </div>
        </div>
      </Card>

      {message && message.text ? (
        <div
          className={`mb-3 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
            message.type === 'success'
              ? 'border-[#ccebdc] bg-[#f3fcf7] text-[#00513f]'
              : 'border-[#f1d7d5] bg-[#fff8f7] text-[#b42318]'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
        <Card className="min-w-0 rounded-[2rem] border border-[#dce8f1] bg-white p-6 shadow-sm">
          <div className="min-w-0 space-y-5">
            <div>
              <h4 className="font-display text-lg font-bold text-[#111d23]">Rooms</h4>
              <p className="mt-1 text-sm text-[#60727b]">Select a room to manage its helper items and settings.</p>
            </div>

            <div className="flex gap-3">
              <input
                className={inputCls}
                placeholder="Add room helper"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#00513f] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                onClick={handleAddRoom}
                disabled={saving}
              >
                <Plus size={15} />
                Add
              </button>
            </div>

            <div className="flex min-w-0 overflow-x-auto gap-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {rooms.map((room) => {
                const isSelected = selectedRoom?.id === room.id;
                const itemCount = (room.item_templates || []).filter((item) => item.is_active !== false).length;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`group cursor-pointer flex shrink-0 w-28 h-36 flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-[#00513f] bg-[#edf8f4] shadow-sm'
                        : 'border-[#dce8f1] bg-[#fbfdff] hover:border-[#bdd4e6] hover:bg-white'
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex w-full items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[#111d23]" title={room.name || 'Untitled Room'}>
                          {room.name || 'Untitled Room'}
                        </div>
                        <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-[#60727b]">
                          Sort {room.sort_order ?? 0}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoomId(room.id);
                          setIsEditingRoom(true);
                        }}
                        className={`shrink-0 rounded-md p-1.5 transition-colors ${
                          isSelected ? 'bg-[#00513f]/10 text-[#00513f] hover:bg-[#00513f]/20' : 'bg-[#f0f5f9] text-[#8aa0ad] hover:bg-[#e2ebf1] hover:text-[#111d23]'
                        }`}
                        title="Edit Room Details"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                    <div className="w-full">
                      <hr className={`mb-2 border-t ${isSelected ? 'border-[#00513f]/20' : 'border-[#dce8f1]'}`} />
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[10px] text-[#506169]">{itemCount} items</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] ${
                            room.is_active !== false
                              ? 'bg-[#edf8f4] text-[#00513f]'
                              : 'bg-[#f4f6f8] text-[#7a8a93]'
                          }`}
                        >
                          {room.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!rooms.length ? (
                <div className="rounded-xl border border-dashed border-[#dce8f1] bg-[#fbfdff] px-4 py-8 text-center text-sm text-[#60727b]">
                  No room helpers yet. Add one or seed the defaults.
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          {selectedRoom ? (
            <>
              <Card className="min-w-0 rounded-[2rem] border border-[#dce8f1] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="font-display text-lg font-bold text-[#111d23]">Item Helpers</h4>
                    <p className="mt-1 text-sm text-[#60727b]">
                      Manage the suggested items customers can choose under <span className="font-semibold text-[#111d23]">{selectedRoom.name}</span>.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] px-4 py-3 text-sm text-[#506169]">
                    {(selectedRoom.item_templates || []).filter((item) => item.is_active !== false).length} active items
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <input
                    className={inputCls}
                    placeholder={`Add item helper for ${selectedRoom.name}`}
                    value={newItemsByRoom[selectedRoom.id] || ''}
                    onChange={(e) => setNewItemsByRoom((prev) => ({ ...prev, [selectedRoom.id]: e.target.value }))}
                  />
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-[#dce8f1] bg-white px-4 py-2 text-sm font-bold text-[#111d23] disabled:opacity-60"
                    onClick={() => addItemToRoom(selectedRoom)}
                    disabled={saving}
                  >
                    <Plus size={15} />
                    Add Item
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 pb-2">
                  {(selectedRoom.item_templates || []).map((item) => (
                    <div
                      key={item.id}
                      className="group flex shrink-0 w-28 h-36 flex-col justify-between rounded-xl border border-[#dce8f1] bg-[#fbfdff] p-2.5 text-left transition-all hover:border-[#bdd4e6] hover:bg-white"
                    >
                      <div className="flex w-full items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-[#111d23]" title={item.name || 'Untitled Item'}>
                            {item.name || 'Untitled Item'}
                          </div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-[#60727b]">
                            Sort {item.sort_order ?? 0}
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingItemId(item.id)}
                          className="shrink-0 rounded-md p-1.5 bg-[#f0f5f9] text-[#8aa0ad] transition-colors hover:bg-[#e2ebf1] hover:text-[#111d23]"
                          title="Edit Item Details"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                      <div className="w-full">
                        <hr className="mb-2 border-t border-[#dce8f1]" />
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] text-[#506169]">{item.weight_lbs_each ?? 0} lbs</span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] ${
                              item.is_active !== false
                                ? 'bg-[#edf8f4] text-[#00513f]'
                                : 'bg-[#f4f6f8] text-[#7a8a93]'
                            }`}
                          >
                            {item.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!selectedRoom.item_templates?.length ? (
                    <div className="w-full rounded-2xl border border-dashed border-[#dce8f1] bg-[#fbfdff] px-4 py-12 text-center text-sm text-[#60727b]">
                      No item helpers yet for this room.
                    </div>
                  ) : null}
                </div>
              </Card>
            </>
          ) : (
            <Card className="rounded-[2rem] border border-[#dce8f1] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf8f4] text-[#00513f]">
                <Package size={20} />
              </div>
              <h4 className="mt-4 font-display text-lg font-bold text-[#111d23]">No room selected</h4>
              <p className="mt-2 text-sm text-[#60727b]">Add a room helper or seed the inventory helper set to begin.</p>
            </Card>
          )}
        </div>
      </div>

      {isEditingRoom && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111d23]/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[2rem] bg-white shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#dce8f1] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff7eb] text-[#b36b00]">
                  <PencilLine size={18} />
                </div>
                <div>
                  <h4 className="font-display text-lg font-bold text-[#111d23]">Edit Room Details</h4>
                </div>
              </div>
              <button
                onClick={() => setIsEditingRoom(false)}
                className="rounded-full p-2 text-[#60727b] transition-colors hover:bg-[#f0f5f9] hover:text-[#111d23]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <div className="space-y-5">
                <label className="block space-y-1.5">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Room Name</span>
                  <input
                    className={inputCls}
                    value={selectedRoom.name || ''}
                    onChange={(e) => handleRoomChange(selectedRoom.id, 'name', e.target.value)}
                  />
                </label>
                <div className="flex gap-4">
                  <label className="block w-1/2 space-y-1.5">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Sort Order</span>
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      value={selectedRoom.sort_order ?? 0}
                      onChange={(e) => handleRoomChange(selectedRoom.id, 'sort_order', Number(e.target.value || 0))}
                    />
                  </label>
                  <label className="block w-1/2 space-y-1.5">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Status</span>
                    <label className="flex h-[42px] cursor-pointer items-center justify-between rounded-xl border border-[#d9e7f2] bg-[#fbfdff] px-3 text-sm text-[#111d23] hover:bg-white">
                      <span className="font-semibold text-[#60727b]">Active</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-[#dce8f1] text-[#00513f] focus:ring-[#00513f]"
                        checked={selectedRoom.is_active !== false}
                        onChange={(e) => handleRoomChange(selectedRoom.id, 'is_active', e.target.checked)}
                      />
                    </label>
                  </label>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00513f] py-3 text-sm font-bold text-white transition-colors hover:bg-[#004233] disabled:opacity-60"
                  onClick={() => {
                    saveRoom(selectedRoom);
                    setIsEditingRoom(false);
                  }}
                  disabled={saving}
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#efd5d3] bg-[#fff8f7] px-4 py-3 text-sm font-bold text-[#b42318] transition-colors hover:bg-[#ffeceb] disabled:opacity-60"
                  onClick={() => {
                    removeRoom(selectedRoom.id);
                    setIsEditingRoom(false);
                  }}
                  disabled={saving}
                  title="Delete Room"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingItem && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111d23]/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[2rem] bg-white shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#dce8f1] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f0f5f9] text-[#8aa0ad]">
                  <PencilLine size={18} />
                </div>
                <div>
                  <h4 className="font-display text-lg font-bold text-[#111d23]">Edit Item Details</h4>
                </div>
              </div>
              <button
                onClick={() => setEditingItemId(null)}
                className="rounded-full p-2 text-[#60727b] transition-colors hover:bg-[#f0f5f9] hover:text-[#111d23]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <div className="space-y-5">
                <label className="block space-y-1.5">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Item Name</span>
                  <input
                    className={inputCls}
                    value={editingItem.name || ''}
                    onChange={(e) => handleItemChange(selectedRoom.id, editingItem.id, 'name', e.target.value)}
                  />
                </label>
                <div className="flex gap-4">
                  <label className="block w-1/2 space-y-1.5">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Sort</span>
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      value={editingItem.sort_order ?? 0}
                      onChange={(e) => handleItemChange(selectedRoom.id, editingItem.id, 'sort_order', Number(e.target.value || 0))}
                    />
                  </label>
                  <label className="block w-1/2 space-y-1.5">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Lbs</span>
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingItem.weight_lbs_each ?? 0}
                      onChange={(e) =>
                        handleItemChange(
                          selectedRoom.id,
                          editingItem.id,
                          'weight_lbs_each',
                          e.target.value === '' ? '' : Math.max(0, Number(e.target.value || 0))
                        )
                      }
                    />
                  </label>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Status</span>
                  <label className="flex h-[42px] cursor-pointer items-center justify-between rounded-xl border border-[#d9e7f2] bg-[#fbfdff] px-3 text-sm text-[#111d23] hover:bg-white">
                    <span className="font-semibold text-[#60727b]">Active</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-[#dce8f1] text-[#00513f] focus:ring-[#00513f]"
                      checked={editingItem.is_active !== false}
                      onChange={(e) => handleItemChange(selectedRoom.id, editingItem.id, 'is_active', e.target.checked)}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00513f] py-3 text-sm font-bold text-white transition-colors hover:bg-[#004233] disabled:opacity-60"
                  onClick={() => {
                    saveItem(editingItem);
                    setEditingItemId(null);
                  }}
                  disabled={saving}
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#efd5d3] bg-[#fff8f7] px-4 py-3 text-sm font-bold text-[#b42318] transition-colors hover:bg-[#ffeceb] disabled:opacity-60"
                  onClick={() => {
                    removeItem(editingItem.id);
                    setEditingItemId(null);
                  }}
                  disabled={saving}
                  title="Remove Item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryWorkflowSettings;
