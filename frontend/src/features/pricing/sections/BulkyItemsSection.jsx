import React, { useState } from 'react';
import {
  PackageSearch,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
  Check,
  X,
  Search,
  Layers,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';

export default function BulkyItemsSection({ config, onChange, isReadOnly }) {
  const bulky = config.bulky_items || { categories: [], items: [] };
  const categories = bulky.categories || [];
  const items = bulky.items || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Category management state
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState({ oldName: '', newName: '' });

  // Item modal / form state
  const [editingItem, setEditingItem] = useState(null); // null or { id, name, category, default_price }
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '',
    category: categories[0] || 'Other Oversized Articles',
    default_price: '100.00',
  });

  const updateBulky = (updatedCategories, updatedItems) => {
    onChange({
      ...config,
      bulky_items: {
        categories: updatedCategories,
        items: updatedItems,
      },
    });
  };

  // --- Category Actions ---
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const nextCategories = [...categories, trimmed];
    updateBulky(nextCategories, items);
    setNewCategoryName('');
  };

  const handleRenameCategory = () => {
    const { oldName, newName } = editingCategory;
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) {
      setEditingCategory({ oldName: '', newName: '' });
      return;
    }
    const nextCategories = categories.map((c) => (c === oldName ? trimmed : c));
    const nextItems = items.map((it) => (it.category === oldName ? { ...it, category: trimmed } : it));
    updateBulky(nextCategories, nextItems);
    if (selectedCategory === oldName) setSelectedCategory(trimmed);
    setEditingCategory({ oldName: '', newName: '' });
  };

  const handleDeleteCategory = (catToDelete) => {
    if (!window.confirm(`Delete category "${catToDelete}"? Items in this category will be moved to "Other Oversized Articles".`)) return;
    const fallback = 'Other Oversized Articles';
    let nextCategories = categories.filter((c) => c !== catToDelete);
    if (!nextCategories.includes(fallback)) {
      nextCategories.push(fallback);
    }
    const nextItems = items.map((it) => (it.category === catToDelete ? { ...it, category: fallback } : it));
    updateBulky(nextCategories, nextItems);
    if (selectedCategory === catToDelete) setSelectedCategory('all');
  };

  const handleMoveCategory = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const next = [...categories];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    updateBulky(next, items);
  };

  // --- Item Actions ---
  const openAddItem = () => {
    setItemForm({
      name: '',
      category: selectedCategory !== 'all' ? selectedCategory : (categories[0] || 'Other Oversized Articles'),
      default_price: '100.00',
    });
    setIsAddingItem(true);
    setEditingItem(null);
  };

  const openEditItem = (item) => {
    setItemForm({
      name: item.name,
      category: item.category,
      default_price: item.default_price || '0.00',
    });
    setEditingItem(item);
    setIsAddingItem(false);
  };

  const handleSaveItem = () => {
    if (!itemForm.name.trim()) return;

    if (editingItem) {
      // Edit existing
      const nextItems = items.map((it) =>
        it.id === editingItem.id
          ? { ...it, ...itemForm, name: itemForm.name.trim() }
          : it
      );
      updateBulky(categories, nextItems);
      setEditingItem(null);
    } else {
      // Add new
      const newItem = {
        id: `bulky_${Date.now()}`,
        ...itemForm,
        name: itemForm.name.trim(),
      };
      updateBulky(categories, [...items, newItem]);
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = (itemId) => {
    if (!window.confirm('Are you sure you want to delete this bulky item?')) return;
    updateBulky(categories, items.filter((it) => it.id !== itemId));
  };

  // Filtered items
  const filteredItems = items.filter((it) => {
    const matchesCat = selectedCategory === 'all' || it.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || it.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Bulky Items</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define oversized articles (pianos, gun safes, pool tables) with category groupings and default flat surcharge prices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManagingCategories(!isManagingCategories)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
              isManagingCategories
                ? 'border-brand-blue bg-blue-50 text-brand-blue dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            {isManagingCategories ? 'Close Categories' : 'Manage Categories'}
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={openAddItem}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 focus:outline-none"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Bulky Item
            </button>
          )}
        </div>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <span className="font-semibold">Independent Item Pricing:</span> In accordance with SmartMoving rules (ADD-05), bulky item fees apply as per-item fixed charges on top of standard shipment volume or weight labor/transportation rates.
        </div>
      </div>

      {/* Category Manager Drawer/Card */}
      {isManagingCategories && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Bulky Item Categories
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Organize articles into logical groups. Drag or use the arrows to reorder.
          </p>

          {!isReadOnly && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          )}

          <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-800">
            {categories.map((cat, idx) => (
              <div key={cat} className="flex items-center justify-between px-3 py-2 text-xs">
                {editingCategory.oldName === cat ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingCategory.newName}
                      onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                      className="rounded border border-brand-blue px-2 py-1 text-xs font-medium text-slate-800 dark:border-blue-500 dark:bg-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleRenameCategory}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      title="Save name"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategory({ oldName: '', newName: '' })}
                      className="text-slate-400 hover:text-slate-600"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="font-medium text-slate-800 dark:text-slate-200">{cat}</span>
                )}

                {!isReadOnly && editingCategory.oldName !== cat && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCategory(idx, -1)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700"
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMoveCategory(idx, 1)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700"
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategory({ oldName: cat, newName: cat })}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                      title="Rename"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                      title="Delete category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bulky items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((it) => it.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Form Modal / Box */}
      {(isAddingItem || editingItem) && (
        <div className="rounded-xl border border-brand-blue/30 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300">
              {editingItem ? 'Edit Bulky Item' : 'New Bulky Item'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsAddingItem(false);
                setEditingItem(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Baby Grand Piano"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Default Price ($)
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.default_price}
                  onChange={(e) => setItemForm({ ...itemForm, default_price: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAddingItem(false);
                setEditingItem(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              disabled={!itemForm.name.trim()}
              className="rounded-lg bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {editingItem ? 'Save Item' : 'Add Item'}
            </button>
          </div>
        </div>
      )}

      {/* Bulky Items Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Item Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Default Surcharge ($)</th>
              <th className="px-4 py-3 text-center">Pricing Rule</th>
              {!isReadOnly && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 4 : 5} className="py-8 text-center text-slate-400">
                  <PackageSearch className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-xs">No bulky items found matching your filter.</p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {item.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">
                    ${parseFloat(item.default_price || '0').toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    Per Item Flat Fee
                  </td>
                  {!isReadOnly && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditItem(item)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
