import React, { useState } from 'react';
import { 
  Sliders, Search, Check, X, Shield, 
  Layers, Filter, Info, Sparkles 
} from 'lucide-react';

export default function FeaturesCatalogTab({ 
  features = [], 
  plans = [] 
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = Array.from(new Set(features.map((f) => f.category)));

  const filteredFeatures = features.filter((f) => {
    const matchesSearch = 
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.key?.toLowerCase().includes(search.toLowerCase()) ||
      f.description?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header and Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Platform Feature Catalog (Section 1.4)</h2>
          <p className="text-xs text-slate-500">Atomic permission capabilities available across SaaS tiers</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features..."
              className="pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${categoryFilter === 'all' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}
            >
              All ({features.length})
            </button>
            {categories.slice(0, 4).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${categoryFilter === cat ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Catalog Grid */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Feature Name & Key</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description</th>
                {plans.map((p) => (
                  <th key={p.id} className="py-3.5 px-4 text-center font-mono">
                    {p.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredFeatures.map((feat) => (
                <tr key={feat.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 dark:text-white block">{feat.name}</span>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{feat.key}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {feat.category}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                    {feat.description}
                  </td>

                  {plans.map((p) => {
                    const access = p.features?.[feat.key] || 'none';
                    return (
                      <td key={p.id} className="py-3 px-4 text-center">
                        {access === 'write' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold" title="Full write access">
                            ✓
                          </span>
                        ) : access === 'read' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-bold text-[10px]" title="Read-only">
                            R
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-sm">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
