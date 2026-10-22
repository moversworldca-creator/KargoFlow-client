import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Layers,
  Loader2,
  Package,
  Pencil,
  Plus,
  Scale,
  Search,
  Sparkles,
  Trash2,
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
  'h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-heading outline-none transition-all placeholder:text-slate-400 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export const seededInventoryRooms = [
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
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
};

const InventoryWorkflowSettings = ({ branchId = null }) => {
  const loadRequestRef = useRef(0);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(() => (branchId ? String(branchId) : ''));

  // Inputs & Search
  const [searchRoomQuery, setSearchRoomQuery] = useState('');
  const [searchItemQuery, setSearchItemQuery] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemWeight, setNewItemWeight] = useState('');

  // Modals
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [editingRoomData, setEditingRoomData] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemData, setEditingItemData] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, target: null });
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  // Sync incoming branchId prop from SettingsHub
  useEffect(() => {
    if (branchId !== undefined && branchId !== null && branchId !== '') {
      setBranchFilter(String(branchId));
    }
  }, [branchId]);

  const setFlash = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Load Branches
  useEffect(() => {
    let active = true;
    getBranches()
      .then((res) => {
        if (!active) return;
        const rows = extractRows(res);
        setBranches(rows);
        if (!branchFilter && rows.length && !branchId) {
          setBranchFilter(String(rows[0].id));
        }
      })
      .catch(() => {
        if (active) setBranches([]);
      });
    return () => {
      active = false;
    };
  }, [branchId]);

  // Load Rooms
  const loadRooms = useCallback(async (requestId) => {
    setLoading(true);
    try {
      const params = {};
      if (branchFilter) {
        params.branch = branchFilter;
        params.branch_id = branchFilter;
      }
      const response = await getInventoryRoomTemplates(params);
      if (requestId !== undefined && requestId !== loadRequestRef.current) return;
      const rows = extractRows(response);
      setRooms(rows);
      setSelectedRoomId((current) => {
        if (rows.some((room) => String(room.id) === String(current))) return current;
        return rows[0]?.id || null;
      });
    } catch (err) {
      if (requestId !== undefined && requestId !== loadRequestRef.current) return;
      console.error('Failed to load inventory rooms:', err);
      setFlash('error', 'Failed to load inventory room templates.');
    } finally {
      if (requestId === undefined || requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [branchFilter]);

  useEffect(() => {
    const reqId = ++loadRequestRef.current;
    loadRooms(reqId);
    return () => {
      if (loadRequestRef.current === reqId) loadRequestRef.current += 1;
    };
  }, [loadRooms]);

  // Sort and filter rooms
  const sortedRooms = useMemo(() => {
    return [...rooms]
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((room, idx) => ({
        ...room,
        sort_order: idx + 1,
      }));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = searchRoomQuery.trim().toLowerCase();
    if (!q) return sortedRooms;
    return sortedRooms.filter((room) => (room.name || '').toLowerCase().includes(q));
  }, [sortedRooms, searchRoomQuery]);

  const selectedRoom = useMemo(() => {
    return sortedRooms.find((r) => String(r.id) === String(selectedRoomId)) || sortedRooms[0] || null;
  }, [sortedRooms, selectedRoomId]);

  // Sort and filter items in selected room
  const roomItems = useMemo(() => {
    if (!selectedRoom?.item_templates) return [];
    return [...selectedRoom.item_templates]
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((item, idx) => ({
        ...item,
        sort_order: idx + 1,
      }));
  }, [selectedRoom]);

  const filteredItems = useMemo(() => {
    const q = searchItemQuery.trim().toLowerCase();
    if (!q) return roomItems;
    return roomItems.filter((item) => (item.name || '').toLowerCase().includes(q));
  }, [roomItems, searchItemQuery]);

  // Overall counters
  const activeRoomCount = useMemo(
    () => rooms.filter((r) => r.is_active !== false).length,
    [rooms]
  );
  const totalItemCount = useMemo(
    () =>
      rooms.reduce(
        (sum, room) =>
          sum + (room.item_templates || []).filter((item) => item.is_active !== false).length,
        0
      ),
    [rooms]
  );
  const totalWeightLbs = useMemo(() => {
    return rooms.reduce((sum, room) => {
      const roomTotal = (room.item_templates || [])
        .filter((i) => i.is_active !== false)
        .reduce((s, i) => s + Number(i.weight_lbs_each || 0), 0);
      return sum + roomTotal;
    }, 0);
  }, [rooms]);

  // Add Room
  const handleAddRoom = async (e) => {
    if (e) e.preventDefault();
    const name = newRoomName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await createInventoryRoomTemplate({
        branch: branchFilter ? Number(branchFilter) : null,
        branch_id: branchFilter ? Number(branchFilter) : null,
        name,
        sort_order: rooms.length + 1,
        is_active: true,
      });
      setNewRoomName('');
      await loadRooms();
      if (created?.id) setSelectedRoomId(created.id);
      setFlash('success', `Room "${name}" created.`);
    } catch (err) {
      const msg = err?.response?.data?.name?.[0] || err?.message || 'Failed to create room template.';
      setFlash('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // Open Room Edit Modal
  const openEditRoom = (room) => {
    setEditingRoomData({
      id: room.id,
      name: room.name || '',
      sort_order: room.sort_order ?? 0,
      is_active: room.is_active !== false,
      branch: room.branch || null,
    });
    setIsEditingRoom(true);
  };

  // Save Room Edits
  const handleSaveRoomEdits = async () => {
    if (!editingRoomData) return;
    const name = editingRoomData.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      await updateInventoryRoomTemplate(editingRoomData.id, {
        branch: editingRoomData.branch,
        branch_id: editingRoomData.branch,
        name,
        sort_order: Number(editingRoomData.sort_order || 0),
        is_active: editingRoomData.is_active !== false,
      });
      setIsEditingRoom(false);
      setEditingRoomData(null);
      await loadRooms();
      setFlash('success', `Room "${name}" updated.`);
    } catch (err) {
      const msg = err?.response?.data?.name?.[0] || 'Failed to save room details.';
      setFlash('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Room Active Status
  const handleToggleRoomActive = async (room, e) => {
    if (e) e.stopPropagation();
    const nextActive = !room.is_active;
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, is_active: nextActive } : r))
    );
    try {
      await updateInventoryRoomTemplate(room.id, {
        branch: room.branch || null,
        branch_id: room.branch || null,
        name: room.name,
        sort_order: room.sort_order ?? 0,
        is_active: nextActive,
      });
      setFlash('success', `Room "${room.name}" is now ${nextActive ? 'Active' : 'Inactive'}.`);
    } catch {
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_active: !nextActive } : r))
      );
      setFlash('error', 'Failed to update room status.');
    }
  };

  // Delete Room
  const handleDeleteRoom = async (room) => {
    setSaving(true);
    try {
      await deleteInventoryRoomTemplate(room.id);
      setDeleteConfirm({ open: false, type: null, target: null });
      await loadRooms();
      setFlash('success', `Room "${room.name}" removed.`);
    } catch (err) {
      setFlash('error', 'Failed to remove room template.');
    } finally {
      setSaving(false);
    }
  };

  // Add Item to Room
  const handleAddItem = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRoom) return;
    const name = newItemName.trim();
    if (!name) return;
    const weight = newItemWeight === '' ? 0 : Math.max(0, Number(newItemWeight || 0));
    setSaving(true);
    try {
      await createInventoryItemTemplate({
        branch: selectedRoom.branch || (branchFilter ? Number(branchFilter) : null),
        branch_id: selectedRoom.branch || (branchFilter ? Number(branchFilter) : null),
        room_template: selectedRoom.id,
        room_template_id: selectedRoom.id,
        name,
        weight_lbs_each: weight,
        sort_order: (selectedRoom.item_templates || []).length + 1,
        is_active: true,
      });
      setNewItemName('');
      setNewItemWeight('');
      await loadRooms();
      setFlash('success', `Item "${name}" added to ${selectedRoom.name}.`);
    } catch (err) {
      const msg = err?.response?.data?.name?.[0] || 'Failed to add item.';
      setFlash('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // Open Item Edit Modal
  const openEditItem = (item) => {
    setEditingItemId(item.id);
    setEditingItemData({
      id: item.id,
      room_template: item.room_template || selectedRoom?.id,
      room_template_id: item.room_template_id || item.room_template || selectedRoom?.id,
      branch: item.branch || null,
      branch_id: item.branch_id || item.branch || null,
      name: item.name || '',
      weight_lbs_each: item.weight_lbs_each ?? 0,
      sort_order: item.sort_order ?? 0,
      is_active: item.is_active !== false,
    });
  };

  // Save Item Edits
  const handleSaveItemEdits = async () => {
    if (!editingItemData) return;
    const name = editingItemData.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      await updateInventoryItemTemplate(editingItemData.id, {
        branch: editingItemData.branch,
        branch_id: editingItemData.branch,
        room_template: editingItemData.room_template,
        room_template_id: editingItemData.room_template_id || editingItemData.room_template,
        name,
        weight_lbs_each: Math.max(0, Number(editingItemData.weight_lbs_each || 0)),
        sort_order: Number(editingItemData.sort_order || 0),
        is_active: editingItemData.is_active !== false,
      });
      setEditingItemId(null);
      setEditingItemData(null);
      await loadRooms();
      setFlash('success', `Item "${name}" saved.`);
    } catch (err) {
      const msg = err?.response?.data?.name?.[0] || 'Failed to save item details.';
      setFlash('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Item Active Status
  const handleToggleItemActive = async (item) => {
    if (!selectedRoom) return;
    const nextActive = !item.is_active;
    // Optimistic update in state
    setRooms((prev) =>
      prev.map((r) =>
        r.id !== selectedRoom.id
          ? r
          : {
              ...r,
              item_templates: (r.item_templates || []).map((it) =>
                it.id === item.id ? { ...it, is_active: nextActive } : it
              ),
            }
      )
    );
    try {
      await updateInventoryItemTemplate(item.id, {
        branch: item.branch || null,
        branch_id: item.branch || null,
        room_template: item.room_template || selectedRoom.id,
        room_template_id: item.room_template_id || item.room_template || selectedRoom.id,
        name: item.name,
        weight_lbs_each: item.weight_lbs_each,
        sort_order: item.sort_order,
        is_active: nextActive,
      });
      setFlash('success', `Item "${item.name}" is now ${nextActive ? 'Active' : 'Inactive'}.`);
    } catch {
      // Revert optimistic update
      setRooms((prev) =>
        prev.map((r) =>
          r.id !== selectedRoom.id
            ? r
            : {
                ...r,
                item_templates: (r.item_templates || []).map((it) =>
                  it.id === item.id ? { ...it, is_active: !nextActive } : it
                ),
              }
        )
      );
      setFlash('error', 'Failed to update item status.');
    }
  };

  // Delete Item
  const handleDeleteItem = async (item) => {
    setSaving(true);
    try {
      await deleteInventoryItemTemplate(item.id);
      setDeleteConfirm({ open: false, type: null, target: null });
      await loadRooms();
      setFlash('success', `Item "${item.name}" removed.`);
    } catch {
      setFlash('error', 'Failed to remove item.');
    } finally {
      setSaving(false);
    }
  };

  // Seed Default Helpers
  const handleSeedDefaults = async () => {
    setSaving(true);
    setShowSeedConfirm(false);
    try {
      const branchParam = branchFilter ? Number(branchFilter) : null;
      const params = branchFilter ? { branch: branchFilter } : {};
      let currentRooms = [];
      try {
        currentRooms = extractRows(await getInventoryRoomTemplates(params));
      } catch {
        currentRooms = [];
      }

      // Clean existing item templates and room templates for clean seed
      for (const room of currentRooms) {
        for (const item of room.item_templates || []) {
          try {
            await deleteInventoryItemTemplate(item.id);
          } catch {
            // ignore
          }
        }
      }
      for (const room of currentRooms) {
        try {
          await deleteInventoryRoomTemplate(room.id);
        } catch {
          // ignore
        }
      }

      // Seed each room and its default items
      for (const [rIdx, roomSeed] of seededInventoryRooms.entries()) {
        const createdRoom = await createInventoryRoomTemplate({
          branch: branchParam,
          branch_id: branchParam,
          name: roomSeed.name,
          sort_order: rIdx + 1,
          is_active: true,
        });

        for (const [iIdx, itemSeed] of roomSeed.items.entries()) {
          await createInventoryItemTemplate({
            branch: branchParam,
            branch_id: branchParam,
            room_template: createdRoom?.id,
            room_template_id: createdRoom?.id,
            name: itemSeed.name,
            weight_lbs_each: itemSeed.weight_lbs_each ?? 0,
            sort_order: iIdx + 1,
            is_active: true,
          });
        }
      }

      await loadRooms();
      setFlash('success', 'Default inventory rooms and items successfully seeded.');
    } catch (err) {
      console.error('Seeding inventory error:', err);
      setFlash('error', 'Failed to seed default inventory helpers.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !rooms.length) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="animate-spin text-brand-blue" size={24} />
        <p className="text-xs font-semibold">Loading inventory catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Top Banner Card - Compact Single-Row Toolbar */}
      <Card className="rounded-xl border border-slate-200 bg-white !p-3 sm:!p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue dark:bg-blue-500/20 dark:text-blue-400">
              <Package size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading text-sm sm:text-base font-bold text-heading dark:text-white truncate">
                  Inventory Templates & Helpers
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  Customer Portal & Estimates
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Define master list of rooms, baseline furniture items, and estimated weights.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {branches.length > 1 && (
              <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
                <Building2 size={12} className="text-slate-400" />
                <select
                  aria-label="Filter by branch"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-heading outline-none dark:text-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
              <Layers size={12} className="text-brand-blue" />
              <span>
                <strong className="text-heading dark:text-white">{activeRoomCount}</strong> Rooms
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
              <Package size={12} className="text-brand-blue" />
              <span>
                <strong className="text-heading dark:text-white">{totalItemCount}</strong> Items
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
              <Scale size={12} className="text-brand-blue" />
              <span>
                <strong className="text-heading dark:text-white">{totalWeightLbs.toLocaleString()}</strong> lbs Total
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSeedConfirm(true)}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-2.5 py-1 text-[11px] font-bold text-brand-blue hover:bg-brand-blue/10 disabled:opacity-60 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 transition"
              title="Reset and populate standard moving industry room and item presets"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Seed Presets
            </button>
          </div>
        </div>
      </Card>

      {/* Flash Banner Alert */}
      {message.text && (
        <div
          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold shadow-xs animate-in slide-in-from-top-1 ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="p-1 hover:opacity-75"
            aria-label="Dismiss alert"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Master-Detail 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Left Column: Rooms List (5 cols on lg, 4 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <Card className="rounded-xl border border-slate-200 bg-white !p-3 sm:!p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-heading dark:text-white">Rooms</h4>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                  {filteredRooms.length} of {rooms.length}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Select room to configure</p>
            </div>

            {/* Quick Add Room Form */}
            <form onSubmit={handleAddRoom} className="flex gap-1.5">
              <input
                className={`${inputCls} h-8 text-xs`}
                placeholder="New room name (e.g. Master Suite)..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                aria-label="New room name"
              />
              <button
                type="submit"
                disabled={saving || !newRoomName.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-brand-navy px-3 h-8 text-xs font-bold text-white shadow-xs hover:bg-brand-navy/90 active:scale-95 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Plus size={13} /> Add
              </button>
            </form>

            {/* Search Rooms Input */}
            {rooms.length > 3 && (
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  type="search"
                  value={searchRoomQuery}
                  onChange={(e) => setSearchRoomQuery(e.target.value)}
                  placeholder="Filter rooms..."
                  className="h-7 w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-6 text-xs text-heading outline-none focus:border-brand-blue dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {searchRoomQuery && (
                  <button
                    onClick={() => setSearchRoomQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-heading"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            )}

            {/* Rooms Stack */}
            <div className="mt-2 space-y-1.5 max-h-[calc(100vh-270px)] sm:max-h-[560px] overflow-y-auto pr-0.5">
              {filteredRooms.map((room) => {
                const isSelected = selectedRoom?.id === room.id;
                const itemsCount = (room.item_templates || []).filter((i) => i.is_active !== false).length;
                const totalRoomWeight = (room.item_templates || [])
                  .filter((i) => i.is_active !== false)
                  .reduce((sum, item) => sum + Number(item.weight_lbs_each || 0), 0);

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRoomId(room.id);
                      }
                    }}
                    className={`group flex items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-blue bg-blue-50/70 shadow-xs dark:border-blue-500 dark:bg-blue-950/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading text-xs font-bold text-heading dark:text-white truncate">
                          {room.name || 'Untitled Room'}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                            room.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {room.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>
                        <span>•</span>
                        <span>{totalRoomWeight} lbs</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">#{room.sort_order ?? 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditRoom(room);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-white hover:text-heading dark:hover:bg-slate-800 dark:hover:text-white transition"
                        title="Edit Room"
                        aria-label={`Edit ${room.name}`}
                      >
                        <Pencil size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ open: true, type: 'room', target: room });
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                        title="Delete Room"
                        aria-label={`Delete ${room.name}`}
                      >
                        <Trash2 size={12} />
                      </button>

                      <ChevronRight
                        size={13}
                        className={`transition ${isSelected ? 'text-brand-blue translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                      />
                    </div>
                  </div>
                );
              })}

              {!filteredRooms.length && (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                  {rooms.length === 0 ? 'No room templates yet. Add one above or seed presets.' : 'No matching rooms found.'}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Items in Selected Room (7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {selectedRoom ? (
            <Card className="rounded-xl border border-slate-200 bg-white !p-3 sm:!p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              {/* Room Header Banner */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-heading text-sm sm:text-base font-bold text-heading dark:text-white">
                    {selectedRoom.name}
                  </h4>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Sort #{selectedRoom.sort_order ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditRoom(selectedRoom)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue hover:underline"
                  >
                    <Edit2 size={10} /> Edit Room
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <span className="font-bold text-heading dark:text-white">
                      {(selectedRoom.item_templates || []).filter((i) => i.is_active !== false).length}
                    </span>{' '}
                    active items
                  </div>
                </div>
              </div>

              {/* Add Item Quick Form */}
              <form onSubmit={handleAddItem} className="flex flex-col gap-1.5 sm:flex-row mb-2.5">
                <input
                  className={`${inputCls} h-8 text-xs flex-1`}
                  placeholder={`Add item to ${selectedRoom.name} (e.g. Sofa, Bookshelf)...`}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  aria-label="New item name"
                />
                <div className="relative w-full sm:w-28 shrink-0">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={`${inputCls} h-8 text-xs pr-7`}
                    placeholder="Weight"
                    value={newItemWeight}
                    onChange={(e) => setNewItemWeight(e.target.value)}
                    aria-label="Item weight in pounds"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    lbs
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={saving || !newItemName.trim()}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-brand-navy px-3.5 h-8 text-xs font-bold text-white shadow-xs hover:bg-brand-navy/90 active:scale-95 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <Plus size={13} /> Add Item
                </button>
              </form>

              {/* Items Search and Stats Bar */}
              {(selectedRoom.item_templates || []).length > 3 && (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input
                      type="search"
                      value={searchItemQuery}
                      onChange={(e) => setSearchItemQuery(e.target.value)}
                      placeholder={`Search items in ${selectedRoom.name}...`}
                      className="h-7 w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-6 text-xs text-heading outline-none focus:border-brand-blue dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    {searchItemQuery && (
                      <button
                        onClick={() => setSearchItemQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-heading"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Showing {filteredItems.length} of {(selectedRoom.item_templates || []).length} items
                  </span>
                </div>
              )}

              {/* Items List / Table */}
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 max-h-[calc(100vh-310px)] sm:max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Item Name
                      </th>
                      <th className="w-24 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Weight
                      </th>
                      <th className="hidden sm:table-cell w-16 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Sort
                      </th>
                      <th className="w-20 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Status
                      </th>
                      <th className="w-16 px-3 py-1.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-3 py-1.5 truncate">
                          <span className="text-xs font-semibold text-heading dark:text-white">
                            {item.name}
                          </span>
                        </td>
                        <td className="w-24 px-3 py-1.5">
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-brand-blue dark:bg-blue-950/40 dark:text-blue-300">
                            {item.weight_lbs_each ?? 0} lbs
                          </span>
                        </td>
                        <td className="hidden sm:table-cell w-16 px-2 py-1.5 text-center text-[11px] text-slate-400 font-mono">
                          #{item.sort_order ?? idx + 1}
                        </td>
                        <td className="w-20 px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleItemActive(item)}
                            disabled={saving}
                            aria-label={`Toggle active status for ${item.name}`}
                            className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                              item.is_active !== false ? 'bg-brand-blue' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform ${
                                item.is_active !== false ? 'translate-x-3.5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="w-16 px-3 py-1.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEditItem(item)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-heading dark:hover:bg-slate-800 dark:hover:text-white transition"
                              title="Edit item details"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({ open: true, type: 'item', target: item })
                              }
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                              title="Delete item"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!filteredItems.length && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-xs text-slate-400">
                          {roomItems.length === 0
                            ? `No items configured for ${selectedRoom.name} yet. Add items above or seed presets.`
                            : 'No matching items found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="rounded-xl border border-slate-200 bg-white !p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Package size={20} />
              </div>
              <h4 className="mt-2.5 font-heading text-sm font-bold text-heading dark:text-white">
                No Room Selected
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Select an existing room from the left column or create a new room template to start managing items.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Edit Room */}
      {isEditingRoom && editingRoomData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-heading text-sm font-bold text-heading dark:text-white">
                Edit Room Details
              </h4>
              <button
                onClick={() => setIsEditingRoom(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-heading"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Room Name*
                </span>
                <input
                  className={inputCls}
                  value={editingRoomData.name}
                  onChange={(e) =>
                    setEditingRoomData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  autoFocus
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Sort Order
                  </span>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={editingRoomData.sort_order}
                    onChange={(e) =>
                      setEditingRoomData((prev) => ({
                        ...prev,
                        sort_order: Number(e.target.value || 0),
                      }))
                    }
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Active Status
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRoomData((prev) => ({ ...prev, is_active: !prev.is_active }))
                    }
                    className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-heading dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <span>{editingRoomData.is_active ? 'Active' : 'Inactive'}</span>
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        editingRoomData.is_active ? 'bg-brand-blue' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                          editingRoomData.is_active ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </span>
                  </button>
                </label>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingRoom(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoomEdits}
                disabled={saving || !editingRoomData.name.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-navy/90 disabled:opacity-50 dark:bg-blue-600"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Item */}
      {editingItemId && editingItemData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-heading text-sm font-bold text-heading dark:text-white">
                Edit Item Details
              </h4>
              <button
                onClick={() => {
                  setEditingItemId(null);
                  setEditingItemData(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-heading"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Item Name*
                </span>
                <input
                  className={inputCls}
                  value={editingItemData.name}
                  onChange={(e) =>
                    setEditingItemData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  autoFocus
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Weight (lbs)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={inputCls}
                    value={editingItemData.weight_lbs_each}
                    onChange={(e) =>
                      setEditingItemData((prev) => ({
                        ...prev,
                        weight_lbs_each: e.target.value === '' ? '' : Math.max(0, Number(e.target.value || 0)),
                      }))
                    }
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Sort Order
                  </span>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={editingItemData.sort_order}
                    onChange={(e) =>
                      setEditingItemData((prev) => ({
                        ...prev,
                        sort_order: Number(e.target.value || 0),
                      }))
                    }
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Active Status
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingItemData((prev) => ({ ...prev, is_active: !prev.is_active }))
                  }
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-heading dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <span>{editingItemData.is_active ? 'Active' : 'Inactive'}</span>
                  <span
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      editingItemData.is_active ? 'bg-brand-blue' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                        editingItemData.is_active ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </button>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditingItemId(null);
                  setEditingItemData(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItemEdits}
                disabled={saving || !editingItemData.name.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-navy/90 disabled:opacity-50 dark:bg-blue-600"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirm.open && deleteConfirm.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <Trash2 size={18} />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-heading dark:text-white">
                  Delete {deleteConfirm.type === 'room' ? 'Room Template' : 'Item'}?
                </h4>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete{' '}
                  <strong className="text-heading dark:text-white">
                    "{deleteConfirm.target.name}"
                  </strong>
                  ?
                  {deleteConfirm.type === 'room' &&
                    ' This will also remove all item helpers configured inside this room.'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ open: false, type: null, target: null })}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'room') {
                    handleDeleteRoom(deleteConfirm.target);
                  } else {
                    handleDeleteItem(deleteConfirm.target);
                  }
                }}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Seed Presets Confirmation */}
      {showSeedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue dark:bg-blue-500/20 dark:text-blue-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-heading dark:text-white">
                  Seed Default Inventory Helpers
                </h4>
                <p className="text-xs text-slate-400">
                  Reset & load standard moving company templates
                </p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                This will populate standard room templates (<strong>Living Room, Bedroom, Kitchen, Dining Room, Office, Garage, Storage</strong>) along with standard furniture items and baseline weights for the selected branch.
              </p>
              <p className="text-slate-400">
                Any existing room and item helpers will be refreshed with the industry standard presets.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSeedConfirm(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-navy/90 disabled:opacity-50 dark:bg-blue-600"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Seed Presets Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryWorkflowSettings;
