// Bulky Items (ADD-03..05): oversized articles by category, each with a price
// per item that is independent of the shipment's weight or volume.
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Dialog, TextField, inputClass } from '../components/ui';
import { formatMoney } from '../format';
import { move, newId, periodOptions } from '../tariffConfig';
import { DecimalInput, ReorderableList, SectionHeader, SectionProblems, SelectInput } from './fields';

export default function BulkyItemsSection({ config, onChange, isReadOnly, problems }) {
  const bulky = config.bulky_items || { categories: [], items: [] };
  const [category, setCategory] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [renaming, setRenaming] = useState(null);
  const set = (next) => onChange({ ...config, bulky_items: { ...bulky, ...next } });
  const categoryName = (id) => bulky.categories.find((c) => c.id === id)?.name || '—';
  const items = category ? bulky.items.filter((i) => i.category_id === category) : bulky.items;
  const saveItem = (item) => {
    const index = bulky.items.findIndex((i) => i.id === item.id);
    set({ items: index >= 0 ? bulky.items.map((i, k) => (k === index ? item : i)) : [...bulky.items, item] });
    setEditingItem(null);
  };
  return (
    <div className="space-y-4">
      <SectionHeader title="Bulky Items" description="Oversized articles (pianos, safes, pool tables …) charged per item, separately from weight or volume based charges." />
      <SectionProblems problems={problems} section="bulky_items" />
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-2">
          <p className="text-xs font-bold">Categories</p>
          <ReorderableList items={bulky.categories} disabled={isReadOnly} emptyText="No categories yet." labelOf={(c) => c.name}
            onReorder={(from, to) => set({ categories: move(bulky.categories, from, to) })}
            onEdit={(c) => setRenaming({ ...c })}
            onRemove={isReadOnly ? null : (c) => {
              if (bulky.items.some((i) => i.category_id === c.id)) return;
              set({ categories: bulky.categories.filter((x) => x.id !== c.id) });
            }}
            render={(c) => (
              <button type="button" className="w-full text-left" aria-pressed={category === c.id} onClick={() => setCategory(category === c.id ? '' : c.id)}>
                <span className="font-semibold">{c.name}</span> <span className="text-slate-500">({bulky.items.filter((i) => i.category_id === c.id).length})</span>
              </button>
            )} />
          {!isReadOnly && (
            <div className="flex items-end gap-2">
              <label className="flex-1 text-xs"><span className="mb-1 block font-semibold">New category</span>
                <input className={inputClass} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} /></label>
              <Button variant="ghost" disabled={!newCategory.trim()} onClick={() => {
                set({ categories: [...bulky.categories, { id: newId(newCategory, bulky.categories.map((c) => c.id)), name: newCategory.trim() }] });
                setNewCategory('');
              }}><Plus size={12} aria-hidden="true" /> Add</Button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">A category with items cannot be removed.</p>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <SelectInput label="Show category" value={category} onChange={setCategory}
              options={[['', 'All categories'], ...bulky.categories.map((c) => [c.id, c.name])]} />
            {!isReadOnly && <Button onClick={() => setEditingItem({ id: '', name: '', category_id: category || bulky.categories[0]?.id || '', periods: {} })}
              disabled={!bulky.categories.length}><Plus size={14} aria-hidden="true" /> Add Bulky Item</Button>}
          </div>
          <ReorderableList items={items} disabled={isReadOnly || Boolean(category)} emptyText="No bulky items." labelOf={(i) => i.name}
            onReorder={(from, to) => set({ items: move(bulky.items, from, to) })} onEdit={(i) => setEditingItem(i)}
            onRemove={isReadOnly ? null : (i) => set({ items: bulky.items.filter((x) => x.id !== i.id) })}
            render={(i) => (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{i.name}</span><Badge>{categoryName(i.category_id)}</Badge>
                <span className="ml-auto tabular-nums">{formatMoney(i.periods?.default)}</span>
              </div>
            )} />
        </div>
      </div>
      {renaming && (
        <Dialog title="Rename category" onClose={() => setRenaming(null)} footer={(
          <><Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
            {!isReadOnly && <Button disabled={!renaming.name.trim()} onClick={() => { set({ categories: bulky.categories.map((c) => (c.id === renaming.id ? { ...c, name: renaming.name.trim() } : c)) }); setRenaming(null); }}>Apply</Button>}</>
        )}>
          <TextField label="Name" value={renaming.name} disabled={isReadOnly} onChange={(name) => setRenaming({ ...renaming, name })} required />
        </Dialog>
      )}
      {editingItem && <ItemDialog item={editingItem} config={config} categories={bulky.categories} taken={bulky.items.map((i) => i.id)}
        readOnly={isReadOnly} onClose={() => setEditingItem(null)} onSave={saveItem} />}
    </div>
  );
}

function ItemDialog({ item, config, categories, taken, readOnly, onClose, onSave }) {
  const [form, setForm] = useState(item);
  const valid = form.name.trim() && form.category_id && form.periods?.default;
  return (
    <Dialog title={item.id ? `Edit ${item.name}` : 'Add bulky item'} onClose={onClose} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button>{!readOnly && <Button disabled={!valid}
        onClick={() => onSave({ ...form, name: form.name.trim(), id: form.id || newId(form.name, taken) })}>Apply</Button>}</>
    )}>
      <fieldset disabled={readOnly} className="space-y-3">
        <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <SelectInput label="Category" value={form.category_id} onChange={(category_id) => setForm({ ...form, category_id })}
          options={categories.map((c) => [c.id, c.name])} />
        <table className="text-xs" aria-label="Price by period">
          <tbody>
            {periodOptions(config).map((p) => (
              <tr key={p.id}><th scope="row" className="pr-2 text-left font-semibold">{p.name}{p.id === 'default' ? ' (default price)' : ''}</th>
                <td><DecimalInput label={`${p.name} price`} places={2} className="w-28 text-right" value={form.periods?.[p.id]}
                  onChange={(v) => setForm({ ...form, periods: { ...form.periods, [p.id]: v } })} /></td></tr>
            ))}
          </tbody>
        </table>
      </fieldset>
    </Dialog>
  );
}
