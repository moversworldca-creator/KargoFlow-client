import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Box, Check, Copy, Package, Plus, Search, Trash2 } from 'lucide-react';

export default function MaterialsSection({ config, onChange, isReadOnly }) {
  const materials = config.materials || [];
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);

  const setMaterials = (updated) => {
    onChange({
      ...config,
      materials: updated,
    });
  };

  const handleAddMaterial = () => {
    const newId = `mat_${Date.now()}`;
    const newMat = {
      id: newId,
      name: 'New Custom Box',
      description: 'Standard packing material',
      unit_price: '5.00',
      cost: '2.00',
      pack_time_minutes: '5',
      unpack_time_minutes: '3',
      editable_rate: true,
      is_container: true,
      cp_code: 'BX1',
      pbo_code: 'BX0',
      container_volume_cuft: '3.0',
      container_weight_lbs: '50',
    };
    setMaterials([...materials, newMat]);
    setEditingId(newId);
  };

  const handleUpdate = (id, patch) => {
    setMaterials(materials.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const handleDelete = (id) => {
    if (isReadOnly) return;
    setMaterials(materials.filter((m) => m.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleMove = (index, dir) => {
    if (isReadOnly) return;
    const target = index + dir;
    if (target < 0 || target >= materials.length) return;
    const copy = [...materials];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setMaterials(copy);
  };

  const filtered = materials.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q) ||
      (m.cp_code || '').toLowerCase().includes(q) ||
      (m.pbo_code || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Materials &amp; Packing Supplies</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define moving supplies, container dimensions, pack/unpack labor times, and CP/PBO three-digit codes.
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddMaterial}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus size={14} /> Add Material
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search materials by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Materials List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
              <tr>
                <th scope="col" className="py-2.5 px-3 w-12 text-center">#</th>
                <th scope="col" className="py-2.5 px-3">Item Name &amp; Description</th>
                <th scope="col" className="py-2.5 px-3 w-28">Type</th>
                <th scope="col" className="py-2.5 px-3 w-24">CP / PBO</th>
                <th scope="col" className="py-2.5 px-3 w-24 text-right">Price</th>
                <th scope="col" className="py-2.5 px-3 w-24 text-right">Cost</th>
                <th scope="col" className="py-2.5 px-3 w-28 text-center">Pack / Unpack</th>
                <th scope="col" className="py-2.5 px-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((mat, idx) => {
                const isEditing = editingId === mat.id;
                return (
                  <React.Fragment key={mat.id}>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {!isReadOnly ? (
                          <div className="flex flex-col items-center">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMove(idx, -1)}
                              className="rounded hover:bg-slate-200 disabled:opacity-20 p-0.5"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === materials.length - 1}
                              onClick={() => handleMove(idx, 1)}
                              className="rounded hover:bg-slate-200 disabled:opacity-20 p-0.5"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{mat.name}</div>
                        {mat.description && <div className="text-[11px] text-slate-500">{mat.description}</div>}
                      </td>
                      <td className="py-2.5 px-3">
                        {mat.is_container ? (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            <Box size={10} /> Container
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Supply
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {mat.is_container ? `${mat.cp_code || '---'} / ${mat.pbo_code || '---'}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                        ${Number(mat.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        ${Number(mat.cost || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300">
                        {mat.is_container ? `${mat.pack_time_minutes || 0}m / ${mat.unpack_time_minutes || 0}m` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingId(isEditing ? null : mat.id)}
                            className="rounded px-2 py-1 text-xs font-semibold text-brand-blue hover:underline"
                          >
                            {isEditing ? 'Close' : 'Edit'}
                          </button>
                          {!isReadOnly && (
                            <button
                              type="button"
                              aria-label={`Delete ${mat.name}`}
                              onClick={() => handleDelete(mat.id)}
                              className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline Editor Drawer */}
                    {isEditing && (
                      <tr className="bg-slate-50/80 dark:bg-slate-900/80">
                        <td colSpan={8} className="p-4 border-t border-b border-slate-200 dark:border-slate-800">
                          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Item Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={mat.name}
                                onChange={(e) => handleUpdate(mat.id, { name: e.target.value })}
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Description
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={mat.description || ''}
                                onChange={(e) => handleUpdate(mat.id, { description: e.target.value })}
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Default Sale Price ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                disabled={isReadOnly}
                                value={mat.unit_price}
                                onChange={(e) => handleUpdate(mat.id, { unit_price: e.target.value })}
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Internal Cost ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                disabled={isReadOnly}
                                value={mat.cost}
                                onChange={(e) => handleUpdate(mat.id, { cost: e.target.value })}
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Container Options */}
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <label className="flex items-center gap-2 mb-3 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={mat.is_container}
                                onChange={(e) => handleUpdate(mat.id, { is_container: e.target.checked })}
                                className="rounded text-brand-blue focus:ring-brand-blue"
                              />
                              <span className="text-xs font-bold text-slate-800 dark:text-white">Is Container (Enables Packing Labor, Volume, and Codes)</span>
                            </label>

                            {mat.is_container && (
                              <div className="grid gap-3 sm:grid-cols-4 bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    CP Code (Carrier Packed)
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={3}
                                    disabled={isReadOnly}
                                    value={mat.cp_code || ''}
                                    onChange={(e) => handleUpdate(mat.id, { cp_code: e.target.value.toUpperCase() })}
                                    placeholder="SM1"
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    PBO Code (Packed By Owner)
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={3}
                                    disabled={isReadOnly}
                                    value={mat.pbo_code || ''}
                                    onChange={(e) => handleUpdate(mat.id, { pbo_code: e.target.value.toUpperCase() })}
                                    placeholder="SM0"
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Volume (cu ft)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    disabled={isReadOnly}
                                    value={mat.container_volume_cuft || ''}
                                    onChange={(e) => handleUpdate(mat.id, { container_volume_cuft: e.target.value })}
                                    placeholder="3.0"
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Pack / Unpack Minutes
                                  </label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="number"
                                      disabled={isReadOnly}
                                      value={mat.pack_time_minutes || ''}
                                      onChange={(e) => handleUpdate(mat.id, { pack_time_minutes: e.target.value })}
                                      placeholder="Pk m"
                                      title="Pack time in minutes"
                                      className="w-1/2 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-center dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                    <input
                                      type="number"
                                      disabled={isReadOnly}
                                      value={mat.unpack_time_minutes || ''}
                                      onChange={(e) => handleUpdate(mat.id, { unpack_time_minutes: e.target.value })}
                                      placeholder="Unpk m"
                                      title="Unpack time in minutes"
                                      className="w-1/2 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-center dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
