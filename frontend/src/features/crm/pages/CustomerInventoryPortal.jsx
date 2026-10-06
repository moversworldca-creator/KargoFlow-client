import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2,
  Plus,
  ShieldAlert,
  RefreshCw,
  AlertCircle,
  Trash2,
  Check,
  Search,
  Package,
  User,
  Mail,
  Calendar,
  ImagePlus,
  UploadCloud,
  X
} from 'lucide-react';

import {
  getPublicEstimateInventoryPortal,
  submitPublicEstimateInventoryPortal,
  uploadPublicEstimateInventoryPortalPhoto
} from '../../../services/api';

// --- Styled Components ---

const Card = ({ children, className = "" }) => (
  <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
    {children}
  </div>
);

const SectionCard = ({ eyebrow, title, description, actions = null, children, className = "" }) => (
  <Card className={className}>
    <div className="border-b border-slate-200 px-5 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <div className="text-xs font-medium uppercase tracking-widest text-slate-500">{eyebrow}</div> : null}
          <h2 className="mt-1 text-lg font-medium text-slate-900">{title}</h2>
          {description ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
    <div className="px-5 py-5">{children}</div>
  </Card>
);

const normalizeRoomName = (value) => (String(value || '').trim() || 'General');

const getPhotoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  try {
    const origin = new URL(apiUrl).origin;
    return `${origin}${url}`;
  } catch {
    return `http://localhost:8000${url}`;
  }
};

const SummaryStat = ({ label, value, icon: Icon, accent = 'text-primary' }) => (
  <div className="rounded-lg border border-primary/15 bg-brand-tint/50 p-4 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</div>
        <div className="mt-1 text-xl font-medium text-slate-900">{value}</div>
      </div>
      {Icon ? (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-white ${accent}`}>
          <Icon size={20} />
        </div>
      ) : null}
    </div>
  </div>
);

const BreakdownRow = ({ label, value, max, tone = 'bg-primary', unit = 'lbs' }) => {
  const safeMax = Math.max(Number(max || 0), 1);
  const pct = Math.max(0, Math.min(100, (Number(value || 0) / safeMax) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="font-medium text-slate-900">{label}</div>
        <div className="font-medium text-slate-900">
          {Number(value || 0).toFixed(0)} {unit}
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const CustomerInventoryPortal = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const photoInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // NEW STATE: Show submit preview modal
  const [showSubmitPreview, setShowSubmitPreview] = useState(false);

  const [meta, setMeta] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [items, setItems] = useState([]);
  const [submittedByName, setSubmittedByName] = useState('');
  const [submittedByEmail, setSubmittedByEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [photoDrafts, setPhotoDrafts] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [activeRoomName, setActiveRoomName] = useState('');
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemRoomName, setCustomItemRoomName] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const inventoryPortalLocked = Boolean(meta?.inventory_portal_locked_at);

  useEffect(() => {
    return () => {
      (photoDrafts || []).forEach((p) => {
        try {
          if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
        } catch {
          // ignore
        }
      });
    };
  }, [photoDrafts]);

  useEffect(() => {
    if (rooms.length && !activeRoomName) {
      setActiveRoomName(normalizeRoomName(rooms[0]?.name));
    }
  }, [rooms, activeRoomName]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(i =>
      i.item_name?.toLowerCase().includes(term) ||
      i.notes?.toLowerCase().includes(term) ||
      i.room_name?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const roomSummaries = useMemo(() => (rooms || []).map((room) => {
    const roomName = normalizeRoomName(room?.name);
    const roomItems = filteredItems.filter((item) => normalizeRoomName(item.room_name) === roomName);
    const qty = roomItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const weight = roomItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.weight_lbs_each || 0), 0);
    return {
      ...room,
      name: roomName,
      itemCount: roomItems.length,
      qty,
      weight,
    };
  }), [rooms, filteredItems]);

  const roomsWithItems = useMemo(() => roomSummaries.filter((room) => Number(room.qty || 0) > 0).length, [roomSummaries]);
  const selectedItems = useMemo(
    () => (items || []).filter((item) => Number(item.quantity || 0) > 0),
    [items]
  );
  const selectedQty = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [selectedItems]
  );
  const selectedWeightLbs = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.weight_lbs_each || 0), 0),
    [selectedItems]
  );
  const selectedRoomSummaries = useMemo(() => {
    return roomSummaries
      .map((room) => {
        const roomItems = selectedItems.filter((item) => normalizeRoomName(item.room_name) === normalizeRoomName(room.name));
        return {
          ...room,
          selectedItems: roomItems,
          selectedCount: roomItems.length,
          selectedQty: roomItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          selectedWeight: roomItems.reduce(
            (sum, item) => sum + Number(item.quantity || 0) * Number(item.weight_lbs_each || 0),
            0
          ),
        };
      })
      .filter((room) => room.selectedQty > 0);
  }, [roomSummaries, selectedItems]);
  const activeRoom = useMemo(
    () => roomSummaries.find((room) => normalizeRoomName(room.name) === normalizeRoomName(activeRoomName)) || roomSummaries[0] || null,
    [roomSummaries, activeRoomName]
  );
  const salesLabel =
    meta?.display_number ||
    meta?.sales_number ||
    meta?.opportunity_sales_number ||
    meta?.lead_sales_number ||
    meta?.lead_number ||
    meta?.lead_id ||
    '';

  const addPhotoDrafts = useCallback((files) => {
    const arr = Array.from(files || []).filter(Boolean);
    if (!arr.length) return [];
    setPhotoUploadError('');
    const drafts = arr.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      notes: '',
      previewUrl: URL.createObjectURL(file),
      status: 'pending', // pending | uploading | uploaded | error
      error: '',
    }));
    setPhotoDrafts((prev) => {
      return [...(prev || []), ...drafts];
    });
    return drafts;
  }, []);

  const removePhotoDraft = useCallback((id) => {
    setPhotoDrafts((prev) => {
      const current = prev || [];
      const found = current.find((p) => p.id === id);
      try {
        if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      } catch {
        // ignore
      }
      return current.filter((p) => p.id !== id);
    });
  }, []);

  const fetchRef = useRef(false);

  const fetchData = useCallback(async (quiet = false) => {
    if (!token) {
      setError('A secure token is required to access your inventory portal.');
      setLoading(false);
      return;
    }
    
    if (fetchRef.current) return;
    fetchRef.current = true;

    if (!quiet) setLoading(true);
    try {
      const portalData = await getPublicEstimateInventoryPortal(token);
      if (!portalData || (!portalData.estimate_id && !portalData.lead_id)) throw new Error('Could not load portal data.');

      setMeta(portalData);
      setUploadedPhotos(portalData.photos || []);

      const templateRooms = (portalData.inventory_room_templates || []).map((room) => ({
        ...room,
        name: room.name,
        is_template: true,
      }));

      const portalItems = portalData.items || [];
      const templateItems = templateRooms.flatMap((room) =>
        (room.item_templates || []).map((item) => ({
          id: `template-${room.id || room.name}-${item.id || item.name}`,
          room_name: room.name,
          item_name: item.name,
          quantity: 0,
          weight_lbs_each: item.weight_lbs_each ?? 0,
          notes: '',
          is_fragile: false,
          is_special: false,
          from_template: true,
        }))
      );
      const itemKey = (item) => `${normalizeRoomName(item.room_name).toLowerCase()}::${String(item.item_name || '').trim().toLowerCase()}`;
      const portalItemMap = new Map((portalItems || []).map((item) => [itemKey(item), item]));
      const templateKeys = new Set(templateItems.map(itemKey));
      const mergedTemplateItems = templateItems.map((templateItem) => {
        const portalItem = portalItemMap.get(itemKey(templateItem));
        if (!portalItem) return templateItem;
        return {
          ...templateItem,
          ...portalItem,
          id: portalItem.id || templateItem.id,
          from_template: portalItem.from_template ?? true,
        };
      });
      const customPortalItems = (portalItems || []).filter((item) => !templateKeys.has(itemKey(item)));
      setItems([...mergedTemplateItems, ...customPortalItems]);

      if (portalItems.length > 0) {
        setSubmittedByName(portalItems[0].submitted_by_name || portalData.customer_name || '');
        setSubmittedByEmail(portalItems[0].submitted_by_email || portalData.customer_email || '');
      } else {
        setSubmittedByName(portalData.customer_name || '');
        setSubmittedByEmail(portalData.customer_email || '');
      }

      // Group rooms
      const itemRooms = [...new Set([...mergedTemplateItems, ...customPortalItems].map(i => i.room_name || 'General'))].map(name => ({ name, is_template: false }));

      const allRoomsMap = {};
      [...templateRooms, ...itemRooms].forEach(r => {
        if (r.name) {
          allRoomsMap[r.name] = {
            ...(allRoomsMap[r.name] || {}),
            ...r
          };
        }
      });

      let finalRooms = Object.values(allRoomsMap);
      if (finalRooms.length === 0) finalRooms = [{ name: 'General', is_template: false }];
      setRooms(finalRooms);
    } catch (err) {
      setError(err.response?.data?.detail || 'The portal uplink is currently offline. Please try again later.');
    } finally {
      if (!quiet) setLoading(false);
      fetchRef.current = false;
    }
  }, [token]);

  const uploadPhotoDrafts = useCallback(async (draftRows) => {
    if (!token) return;
    if (inventoryPortalLocked) {
      setPhotoUploadError('Inventory portal is locked and cannot accept photo uploads right now.');
      return;
    }
    const pending = (draftRows || []).filter((p) => p.status === 'pending' && p.file);
    if (!pending.length) return;

    setUploadingPhotos(true);
    setPhotoUploadError('');
    try {
      for (const draft of pending) {
        setPhotoDrafts((prev) => (prev || []).map((p) => (p.id === draft.id ? { ...p, status: 'uploading', error: '' } : p)));
        try {
          const uploaded = await uploadPublicEstimateInventoryPortalPhoto({ token, file: draft.file, notes: draft.notes });
          if (uploaded?.file) {
            setUploadedPhotos((prev) => {
              const next = (prev || []).filter((p) => String(p.id) !== String(uploaded.id));
              next.unshift({
                id: uploaded.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                filename: draft.file?.name || uploaded.filename || 'inventory-photo',
                file_url: uploaded.file,
                notes: draft.notes || '',
              });
              return next;
            });
          }
          setPhotoDrafts((prev) => (prev || []).map((p) => (p.id === draft.id ? { ...p, status: 'uploaded', error: '' } : p)));
        } catch (err) {
          const msg = err?.response?.data?.detail || err?.message || 'Failed to upload photo.';
          setPhotoDrafts((prev) => (prev || []).map((p) => (p.id === draft.id ? { ...p, status: 'error', error: msg } : p)));
        }
      }
      await fetchData(true);
      setPhotoDrafts((prev) => (prev || []).filter((p) => p.status !== 'uploaded'));
    } finally {
      setUploadingPhotos(false);
    }
  }, [token, fetchData, inventoryPortalLocked]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openPhotoPicker = useCallback(() => {
    if (inventoryPortalLocked) {
      setError('Inventory portal is locked and cannot be edited right now.');
      return;
    }
    photoInputRef.current?.click();
  }, [inventoryPortalLocked]);

  const handlePhotoInputChange = useCallback(async (event) => {
    const drafts = addPhotoDrafts(event?.target?.files);
    if (event?.target) event.target.value = '';
    if (!drafts.length) return;
    await uploadPhotoDrafts(drafts);
  }, [addPhotoDrafts, uploadPhotoDrafts]);

  const handleUpdateItemProperty = (itemId, property, value) => {
    if (inventoryPortalLocked) return;
    setItems(prev => (prev || []).map(item => item.id === itemId ? { ...item, [property]: value } : item));
  };

  const handleUpdateItemQuantity = (itemId, delta) => {
    if (inventoryPortalLocked) return;
    setItems(prev => (prev || []).map(item => {
      if (item.id === itemId) {
        const nextQty = Math.max(0, Number(item.quantity || 0) + delta);
        return { ...item, quantity: nextQty };
      }
      return item;
    }));
  };

  const handleDeleteItem = (itemId) => {
    if (inventoryPortalLocked) return;
    setItems(prev => (prev || []).filter(item => item.id !== itemId));
  };

  const openCustomItemModal = useCallback(() => {
    setCustomItemRoomName(normalizeRoomName(activeRoomName || rooms[0]?.name || 'General'));
    setCustomItemName('');
    setShowCustomItemModal(true);
  }, [activeRoomName, rooms]);

  const closeCustomItemModal = useCallback(() => {
    setShowCustomItemModal(false);
    setCustomItemRoomName('');
    setCustomItemName('');
  }, []);

  const handleAddCustomItem = useCallback((roomName, nameValue) => {
    if (inventoryPortalLocked) return;
    const normalizedRoomName = normalizeRoomName(roomName);
    const name = String(nameValue || '').trim();
    if (!name || !normalizedRoomName) return;
    const newItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      room_name: normalizedRoomName,
      item_name: name,
      quantity: 1,
      weight_lbs_each: 0,
      is_fragile: false,
      is_special: false,
      notes: '',
      from_template: false
    };
    setItems(prev => [...(prev || []), newItem]);
    closeCustomItemModal();
  }, [closeCustomItemModal, inventoryPortalLocked]);

  const clearRoomSelections = useCallback((roomName) => {
    if (inventoryPortalLocked) return;
    const room = normalizeRoomName(roomName);
    setItems((prev) =>
      (prev || []).map((item) =>
        normalizeRoomName(item.room_name) === room ? { ...item, quantity: 0 } : item
      )
    );
  }, [inventoryPortalLocked]);

  const handleInitiateSubmit = () => {
    if (inventoryPortalLocked) {
      setError('Inventory portal is locked and cannot be submitted right now.');
      return;
    }
    if (!selectedItems.length) {
      setError('Please select at least one inventory item before submitting.');
      return;
    }
    if (!submittedByName.trim() || !submittedByEmail.trim()) {
      setError('Please provide your name and email so we can verify your submission.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowSubmitPreview(true);
  };

  // CONFIRM SUBMIT: Processes the actual request
  const handleConfirmSubmit = async () => {
    if (inventoryPortalLocked) {
      setShowSubmitPreview(false);
      setError('Inventory portal is locked and cannot be submitted right now.');
      return;
    }
    setShowSubmitPreview(false);
    setSyncing(true);
    setError('');
    try {
      await submitPublicEstimateInventoryPortal({
        token,
        submitted_by_name: submittedByName,
        submitted_by_email: submittedByEmail,
        items: selectedItems
      });
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to transmit inventory. Please check your connection.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(31,122,224,0.14),transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef5fa_100%)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-xs uppercase tracking-widest text-slate-500">Loading inventory</p>
        </div>
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(31,122,224,0.14),transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef5fa_100%)] p-6 text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/15 bg-brand-tint/60 text-primary">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">Access denied</h2>
        <p className="mt-3 max-w-md mx-auto text-slate-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-10 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-[0_14px_28px_-18px_rgba(31,122,224,0.7)] transition-colors hover:bg-primary-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  const portalSettings = meta?.customer_portal_settings || {};

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(31,122,224,0.12),transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef5fa_100%)] pb-12 text-slate-900">
      
      {/* --- MAIN PAGE CONTENT WRAPPER --- */}
      <div className="relative mx-auto max-w-12xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="overflow-hidden rounded-xl border border-primary/10 bg-white/92 shadow-[0_30px_80px_-40px_rgba(31,122,224,0.35)] backdrop-blur">
          <div className="border-b border-primary/10 bg-brand-tint/45 px-5 py-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-medium uppercase tracking-widest text-primary">Inventory portal</div>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
                  {portalSettings.portal_title || 'Inventory Portal'}
                </h1>
              </div>

              {/* Flex header layout: Tightened gaps and padding specifically for mobile */}
              <div className="flex w-full flex-row gap-1.5 sm:w-auto sm:gap-3 lg:flex-col xl:flex-row">
                
                <div className="flex flex-1 shrink min-w-0 sm:min-w-[140px] items-center justify-between gap-1 sm:gap-6 rounded-lg border border-primary/15 bg-white px-2 py-1.5 sm:px-4 sm:py-3 shadow-sm">
                  <div className="min-w-0">
                    <div className="truncate text-[9px] sm:text-xs uppercase tracking-widest text-primary">Sales</div>
                    <div className="truncate mt-0.5 text-[11px] sm:text-sm font-medium text-slate-900">#{salesLabel}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchData()}
                    disabled={syncing}
                    className="shrink-0 rounded-lg border border-primary/15 bg-brand-tint/60 p-1.5 sm:p-2.5 text-primary transition-colors hover:bg-brand-tint hover:text-primary-hover"
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${syncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-1 shrink min-w-0 sm:min-w-[140px] items-center justify-between gap-1 sm:gap-6 rounded-lg border border-primary/15 bg-white px-2 py-1.5 sm:px-4 sm:py-3 shadow-sm">
                  <div className="min-w-0">
                    <div className="truncate text-[9px] sm:text-xs uppercase tracking-widest text-primary">Move date</div>
                    <div className="truncate mt-0.5 text-[11px] sm:text-sm font-medium text-slate-900">{meta?.move_date || 'TBD'}</div>
                  </div>
                  <Calendar className="shrink-0 h-3 w-3 sm:h-[18px] sm:w-[18px] text-primary" />
                </div>
                {/* {inventoryPortalLocked ? (
                  <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 shadow-sm">
                    <ShieldAlert size={18} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-widest">Portal locked</div>
                      <div className="text-sm">This inventory portal is read-only until the estimate team unlocks it.</div>
                    </div>
                  </div>
                ) : null} */}
                <button
                  type="button"
                  onClick={handleInitiateSubmit}
                  disabled={syncing || selectedItems.length === 0 || inventoryPortalLocked}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm text-white shadow-[0_14px_28px_-18px_rgba(31,122,224,0.7)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {syncing ? <Loader2 className="animate-spin" size={18} /> : null}
                  <span>{inventoryPortalLocked ? 'Locked' : (portalSettings.submit_button_label || 'Submit')}</span>
                </button>

              </div>

            </div>
          </div>

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {error ? (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-primary/15 bg-brand-tint/50 px-4 py-3 text-slate-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="flex-1 text-sm">{error}</p>
                <button onClick={() => setError('')} className="rounded p-1 transition-colors hover:bg-brand-tint">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
            ) : null}

            <SectionCard
              eyebrow="Photos"
              title="Inventory photos"
              actions={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={openPhotoPicker}
                    disabled={inventoryPortalLocked}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/15 bg-white px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-brand-tint"
                  >
                    {uploadingPhotos ? <Loader2 size={16} className="animate-spin text-primary" /> : <ImagePlus size={16} className="text-primary" />}
                    {uploadingPhotos ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              }
            >
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoInputChange}
              />

              {photoUploadError ? (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {photoUploadError}
                </div>
              ) : null}

              {(photoDrafts || []).length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(photoDrafts || []).map((p) => (
                    <div key={p.id} className="overflow-hidden rounded-lg border border-primary/15 bg-white shadow-sm">
                      <div className="relative aspect-[5/4] bg-white">
                        <img src={p.previewUrl} alt={p.file?.name || 'Photo'} className="h-full w-full object-cover" />
                        {p.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => removePhotoDraft(p.id)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-primary/15 bg-white text-slate-500 transition-colors hover:bg-brand-tint hover:text-slate-900"
                          >
                            <X size={16} />
                          </button>
                        ) : null}
                        <div className="absolute left-2 top-2 inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-white px-2.5 py-1 text-[11px] text-slate-700 shadow-sm">
                          {p.status === 'uploaded' ? (
                            <span className="text-emerald-600">Uploaded</span>
                          ) : p.status === 'uploading' ? (
                            <span className="text-primary">Uploading</span>
                          ) : p.status === 'error' ? (
                            <span className="text-red-600">Error</span>
                          ) : (
                            <span className="text-slate-500">Selected</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="truncate text-xs font-medium text-slate-900" title={p.file?.name}>
                          {p.file?.name}
                        </div>
                        {p.error ? <div className="text-xs text-red-600">{p.error}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/15 bg-brand-tint/35 px-4 py-4 text-sm text-slate-600">
                  <div>No photos selected.</div>
                </div>
              )}

              {uploadedPhotos.length > 0 ? (
                <div className="mt-8 border-t border-primary/15 pt-8">
                  <div className="mb-4 text-xs uppercase tracking-widest text-primary">Uploaded photos</div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {uploadedPhotos.map((photo) => (
                      <div key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-primary/15 bg-slate-50 shadow-sm">
                        {photo.file_url ? (
                          <img
                            src={getPhotoUrl(photo.file_url)}
                            alt={photo.filename || 'Uploaded photo'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                            <Package size={24} />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="mb-1 truncate text-[11px] font-medium leading-tight" title={photo.filename}>
                            {photo.filename}
                          </p>
                          {photo.notes ? (
                            <p className="line-clamp-2 text-[10px] leading-tight text-slate-200">{photo.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
              
              {/* === LEFT SIDEBAR === */}
              {/* min-w-0 completely protects the grid from stretching due to horizontal scrolling children */}
              <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1">
                <Card className="border-primary/15 bg-brand-tint/35 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-primary">Sales #{salesLabel}</div>
                      <div className="mt-1 text-base font-medium text-slate-900">{roomsWithItems} of {rooms.length} rooms</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchData()}
                      className="rounded-lg border border-primary/15 bg-white p-2.5 text-primary transition-colors hover:bg-brand-tint hover:text-primary-hover"
                    >
                      <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="mt-4 text-sm text-slate-600">Live sync enabled</div>
                </Card>

                {/* MOBILE/TABLET SEARCH BAR (Hidden on Desktop) */}
                <div className="block xl:hidden relative w-full">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" size={18} />
                  <input
                    type="text"
                    placeholder="Search items"
                    className="w-full rounded-lg border border-primary/15 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Card className="border-primary/15 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-xs uppercase tracking-widest text-primary">Rooms</div>
                  {/* Safely contained horizontal scroll with reduced mobile width (130px) */}
                  <div className="flex overflow-x-auto gap-2 sm:gap-0 pb-2 sm:flex-col sm:space-y-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {roomSummaries.map((room) => {
                      const isActive = normalizeRoomName(room.name) === normalizeRoomName(activeRoomName);
                      return (
                        <button
                          key={room.id || room.name}
                          type="button"
                          onClick={() => setActiveRoomName(room.name)}
                          className={`shrink-0 w-[124px] sm:w-full sm:shrink flex items-center justify-between gap-2 sm:gap-3 rounded-lg border px-3 py-2 sm:px-4 sm:py-3 text-left transition-colors ${isActive
                              ? 'border-primary/30 bg-brand-tint/60'
                              : 'border-primary/10 bg-white hover:bg-brand-tint/30'
                            }`}
                        >
                          <div className="min-w-0">
                            <div className={`truncate text-xs sm:text-sm font-medium ${isActive ? 'text-primary' : 'text-slate-900'}`}>{room.name}</div>
                            <div className="mt-0.5 text-[10px] sm:text-xs text-slate-500">{room.itemCount} items</div>
                          </div>
                          <div className="shrink-0 rounded border border-primary/15 bg-brand-tint/40 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs text-slate-700">
                            {room.qty}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </aside>

              {/* === MIDDLE SECTION (Completely Restored to Original Parity) === */}
              <section className="space-y-5">
                
                {/* DESKTOP SEARCH BAR (Hidden on Mobile/Tablet) */}
                <div className="hidden xl:flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-2xl">
                    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" size={18} />
                    <input
                      type="text"
                      placeholder="Search items"
                      className="w-full rounded-lg border border-primary/15 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-primary/15 bg-brand-tint/35 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-primary">Active room</div>
                      <div className="mt-1 text-xl font-medium text-slate-900">{activeRoom?.name || 'General'}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCustomItemModal()}
                    disabled={inventoryPortalLocked}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm text-white shadow-[0_14px_28px_-18px_rgba(31,122,224,0.7)] transition-colors hover:bg-primary-hover"
                  >
                    <Plus size={16} />
                    Add item
                  </button>
                </div>

                <div className="space-y-5">
                  {searchTerm.trim() ? (
                    (() => {
                      const matchingRooms = roomSummaries
                        .map((room) => {
                          const roomItems = filteredItems.filter((i) => normalizeRoomName(i.room_name) === normalizeRoomName(room.name));
                          return { room, roomItems };
                        })
                        .filter(({ roomItems }) => roomItems.length > 0);

                      if (!matchingRooms.length) {
                        return (
                          <Card className="border-primary/15 bg-brand-tint/30 p-8 text-center shadow-sm">
                            <Search size={28} className="mx-auto text-primary/50" />
                            <div className="mt-4 text-base font-medium text-slate-900">No matches found</div>
                          </Card>
                        );
                      }

                      return matchingRooms.map(({ room, roomItems }) => {
                        const roomName = normalizeRoomName(room.name);
                        const roomDistinct = roomItems.length;
                        const roomQty = roomItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
                        const roomWeight = roomItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.weight_lbs_each || 0), 0);

                        return (
                          <Card key={room.id || room.name} className="border-primary/15 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-primary/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <h2 className="text-xl font-semibold text-slate-900">{roomName}</h2>
                                <div className="mt-2 flex flex-wrap gap-2.5 text-sm text-slate-600">
                                  <span>{roomDistinct} items</span>
                                  <span>Qty {roomQty}</span>
                                  <span>{roomWeight.toFixed(1)} lbs</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1 scroll-thin">
                              <div className="mb-3 text-xs uppercase tracking-widest text-primary">Items</div>
                              <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {roomItems.map((item) => {
                                  const quantity = Number(item?.quantity || 0);
                                  const itemName = item?.item_name || 'Item';
                                  const itemWeight = Number(item?.weight_lbs_each || 0) || 0;
                                  return (
                                    <div key={item.id} className="rounded-xl border border-primary/10 bg-white p-2.5 sm:p-3.5 shadow-sm">
                                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                            <h3 className="truncate text-sm sm:text-[0.95rem] font-semibold text-slate-900">{itemName}</h3>
                                            {item.from_template === false ? (
                                              <span className="rounded-full border border-primary/15 bg-brand-tint/60 px-2 py-0.5 text-[10px] font-medium text-primary">
                                                Custom
                                              </span>
                                            ) : null}
                                          </div>
                                          {itemWeight > 0 ? (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                              <span className="rounded-full border border-primary/15 bg-brand-tint/40 px-2 py-0.5 text-[9px] sm:text-[10px] text-slate-600">
                                                {itemWeight.toFixed(1)} lbs each
                                              </span>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>

                                      <div className="mt-3 flex items-center justify-between gap-1.5 sm:gap-3 rounded-2xl border border-primary/10 bg-brand-tint/35 p-1.5 sm:p-2.5">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemQuantity(item.id, -1)}
                                        disabled={inventoryPortalLocked}
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/10 bg-white text-primary transition-colors hover:border-primary/20 hover:bg-brand-tint hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Decrease quantity"
                                      >
                                        -
                                      </button>
                                        <div className="min-w-0 flex-1 text-center">
                                          <div className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-primary/70">Qty</div>
                                          <div className="mt-0.5 text-lg sm:text-xl font-semibold tracking-tight text-slate-900">{quantity}</div>
                                        </div>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemQuantity(item.id, 1)}
                                        disabled={inventoryPortalLocked}
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/10 bg-white text-primary transition-colors hover:border-primary/20 hover:bg-brand-tint hover:text-primary-hover"
                                        aria-label="Increase quantity"
                                      >
                                        +
                                      </button>
                                      </div>

                                      <input
                                        type="text"
                                        value={item.notes || ''}
                                        onChange={(e) => handleUpdateItemProperty(item.id, 'notes', e.target.value)}
                                        placeholder="Notes"
                                        className="mt-3 w-full rounded-xl border border-primary/15 bg-brand-tint/20 px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                                        disabled={inventoryPortalLocked}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </Card>
                        );
                      });
                    })()
                  ) : activeRoom ? (() => {
                    const roomName = normalizeRoomName(activeRoom?.name);
                    const roomItems = filteredItems.filter((i) => normalizeRoomName(i.room_name) === roomName);
                    const roomDistinct = roomItems.length;
                    const roomQty = roomItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
                    const roomWeight = roomItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.weight_lbs_each || 0), 0);

                    return (
                      <Card className="border-primary/15 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-primary/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h2 className="text-xl font-semibold text-slate-900">{roomName}</h2>
                            <div className="mt-2 flex flex-wrap gap-2.5 text-sm text-slate-600">
                              <span>{roomDistinct} items</span>
                              <span>Qty {roomQty}</span>
                              <span>{roomWeight.toFixed(1)} lbs</span>
                            </div>
                          </div>
                          {roomQty > 0 ? (
                            <button
                              type="button"
                              onClick={() => clearRoomSelections(roomName)}
                              disabled={inventoryPortalLocked}
                              className="inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-brand-tint/40 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-brand-tint"
                            >
                              <Trash2 size={14} />
                              Clear room
                            </button>
                          ) : null}
                        </div>



                        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1 scroll-thin">
                          <div className="mb-3 text-xs uppercase tracking-widest text-primary">Items</div>
                          {roomItems.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 xl:grid-cols-5">
                              {roomItems.map((item) => {
                                const quantity = Number(item?.quantity || 0);
                                const itemName = item?.item_name || 'Item';
                                const itemWeight = Number(item?.weight_lbs_each || 0) || 0;
                                return (
                                  <div key={item.id} className="overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm transition-shadow hover:shadow-md">
                                    <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-brand-amber/70" />
                                    <div className="p-2.5 sm:p-3.5">
                                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                          <h3 className="truncate text-sm sm:text-[0.95rem] font-semibold text-slate-900">{itemName}</h3>
                                          {item.from_template === false ? (
                                            <span className="rounded-full border border-primary/15 bg-brand-tint/60 px-2 py-0.5 text-[10px] font-medium text-primary">
                                              Custom
                                            </span>
                                          ) : null}
                                        </div>
                                        {itemWeight > 0 ? (
                                          <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-primary/15 bg-brand-tint/40 px-2 py-0.5 text-[9px] sm:text-[10px] text-slate-600">
                                              {itemWeight.toFixed(1)} lbs each
                                            </span>
                                          </div>
                                        ) : null}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="shrink-0 rounded-full border border-primary/15 bg-white p-1.5 sm:p-2 text-slate-500 transition-colors hover:border-red-200 hover:text-red-600"
                                        title="Remove item"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </button>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between gap-1.5 sm:gap-3 rounded-2xl border border-primary/10 bg-brand-tint/35 p-1.5 sm:p-2.5">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemQuantity(item.id, -1)}
                                        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-primary/10 bg-white text-primary transition-colors hover:border-primary/20 hover:bg-brand-tint hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Decrease quantity"
                                      >
                                        -
                                      </button>
                                      <div className="min-w-0 flex-1 text-center">
                                        <div className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-primary/70">Qty</div>
                                        <div className="mt-0.5 text-lg sm:text-xl font-semibold tracking-tight text-slate-900">{quantity}</div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateItemQuantity(item.id, 1);
                                        }}
                                        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-primary/10 bg-white text-primary transition-colors hover:border-primary/20 hover:bg-brand-tint hover:text-primary-hover"
                                        aria-label="Increase quantity"
                                      >
                                        +
                                      </button>
                                    </div>

                                    <input
                                      type="text"
                                      value={item.notes || ''}
                                      onChange={(e) => handleUpdateItemProperty(item.id, 'notes', e.target.value)}
                                      placeholder="Notes"
                                      className="mt-3 w-full rounded-xl border border-primary/15 bg-brand-tint/20 px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                                    />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-primary/20 bg-brand-tint/25 px-4 py-4 text-sm text-slate-500">
                              No items in this room.
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })() : (
                    <Card className="border-primary/15 bg-brand-tint/30 p-8 text-center shadow-sm">
                      <Package size={28} className="mx-auto text-primary/50" />
                      <div className="mt-4 text-base font-medium text-slate-900">No rooms available</div>
                    </Card>
                  )}
                </div>

              </section>

              {/* === RIGHT SIDEBAR === */}
              <aside className="space-y-5 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pl-1">
                <Card className="border-primary/15 bg-brand-tint/35 p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-widest text-primary">Selected summary</div>
                  <div className="mt-3 grid gap-3">
                    <SummaryStat label="Rooms" value={selectedRoomSummaries.length} icon={Package} />
                    <SummaryStat label="Items" value={selectedItems.length} icon={Check} />
                    <SummaryStat label="Quantity" value={selectedQty} icon={Package} />
                    <SummaryStat label="Weight" value={`${selectedWeightLbs.toFixed(1)} lbs`} icon={Package} />
                  </div>
                </Card>

                <Card className="border-primary/15 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-xs uppercase tracking-widest text-primary">Selected items</div>
                  {selectedRoomSummaries.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRoomSummaries.map((room) => (
                        <div key={room.id || room.name} className="rounded-lg border border-primary/10 bg-brand-tint/35 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">{room.name}</div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {room.selectedCount} item{room.selectedCount === 1 ? '' : 's'}
                              </div>
                            </div>
                            <div className="rounded border border-primary/15 bg-white px-2 py-1 text-xs text-slate-700">
                              {room.selectedQty}
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {room.selectedItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                                <div className="min-w-0 truncate text-slate-700">{item.item_name || 'Item'}</div>
                                <div className="shrink-0 text-slate-900">x{Number(item.quantity || 0)}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            {room.selectedWeight.toFixed(1)} lbs
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-primary/20 bg-brand-tint/25 px-4 py-4 text-sm text-slate-500">
                      No items selected yet.
                    </div>
                  )}
                </Card>

              </aside>
            </div>
          </main>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
            Movers CRM
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🚀 ALL MODALS MOVED HERE - OUTSIDE THE BACKDROP-BLUR DIV 🚀 */}
      {/* ============================================================== */}

      {showSuccess ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-primary/15 bg-white p-8 text-center shadow-[0_30px_80px_-40px_rgba(31,122,224,0.35)]">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-brand-tint/70 text-primary">
              <Check size={28} strokeWidth={3} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Inventory submitted</h3>
            <p className="mt-3 text-sm text-slate-600">Your inventory list was sent successfully.</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showSubmitPreview ? (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity"
          onClick={() => setShowSubmitPreview(false)}
          role="presentation"
        >
          <div 
            className="w-full max-w-[360px] rounded-2xl border border-primary/15 bg-white p-5 shadow-[0_30px_80px_-40px_rgba(31,122,224,0.35)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#4B8AF3]">Selected Summary</h3>
            </div>

            <div className="flex flex-col gap-3">
              {/* Rooms */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f8fafc] p-3 transition-colors hover:border-[#4B8AF3]/30">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rooms</div>
                  <div className="mt-0.5 text-lg font-medium text-slate-800">{selectedRoomSummaries.length}</div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/20 bg-white text-[#4B8AF3] shadow-sm">
                  <Package size={16} strokeWidth={2.5} />
                </div>
              </div>

              {/* Items */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f8fafc] p-3 transition-colors hover:border-[#4B8AF3]/30">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Items</div>
                  <div className="mt-0.5 text-lg font-medium text-slate-800">{selectedItems.length}</div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/20 bg-white text-[#4B8AF3] shadow-sm">
                  <Check size={16} strokeWidth={2.5} />
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f8fafc] p-3 transition-colors hover:border-[#4B8AF3]/30">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quantity</div>
                  <div className="mt-0.5 text-lg font-medium text-slate-800">{selectedQty}</div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/20 bg-white text-[#4B8AF3] shadow-sm">
                  <Package size={16} strokeWidth={2.5} />
                </div>
              </div>

              {/* Weight */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f8fafc] p-3 transition-colors hover:border-[#4B8AF3]/30">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Weight</div>
                  <div className="mt-0.5 text-lg font-medium text-slate-800 truncate pr-2">{selectedWeightLbs.toFixed(1)} <span className="text-sm text-slate-500 font-normal">lbs</span></div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/20 bg-white text-[#4B8AF3] shadow-sm">
                  <Package size={16} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitPreview(false)}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={inventoryPortalLocked || syncing}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-hover hover:-translate-y-0.5"
              >
                Accept & Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCustomItemModal ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
          onClick={closeCustomItemModal}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-primary/15 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(31,122,224,0.35)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-item-modal-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest text-primary">Custom item</div>
                <h3 id="custom-item-modal-title" className="mt-1 text-xl font-medium text-slate-900">
                  Add a custom item
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCustomItemModal}
                className="rounded-lg border border-primary/15 bg-brand-tint/50 p-2 text-primary transition-colors hover:bg-brand-tint hover:text-primary-hover"
                aria-label="Close custom item dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddCustomItem(customItemRoomName, customItemName);
              }}
            >
              <div>
                <label htmlFor="custom-item-room" className="mb-2 block text-sm font-medium text-slate-700">
                  Room
                </label>
                <select
                  id="custom-item-room"
                  value={customItemRoomName}
                  onChange={(e) => setCustomItemRoomName(e.target.value)}
                  className="w-full rounded-lg border border-primary/15 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="" disabled>
                    Select a room
                  </option>
                  {(roomSummaries || []).map((room) => (
                    <option key={room.id || room.name} value={room.name}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="custom-item-name" className="mb-2 block text-sm font-medium text-slate-700">
                  Item name
                </label>
                <input
                  id="custom-item-name"
                  type="text"
                  autoFocus
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="Enter a custom item name"
                  className="w-full rounded-lg border border-primary/15 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCustomItemModal}
                  className="inline-flex items-center justify-center rounded-lg border border-primary/15 px-5 py-3 text-sm text-slate-700 transition-colors hover:bg-brand-tint"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!String(customItemName || '').trim() || !String(customItemRoomName || '').trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Plus size={16} />
                  Add item
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default CustomerInventoryPortal;
