import React, { useState, useMemo } from 'react';
import { 
  Plus, ArrowLeft, Search, Check, X, Shield, 
  Layers, Filter, Info, Sparkles, RefreshCw, 
  ChevronDown, Sliders, Key, Trash2, ArrowRight, 
  Eye, Lock, BookOpen, Save, ShieldCheck
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { ALL_PLATFORM_FEATURES } from './PlanFeatureMatrixPage';

export default function FeaturesCatalogTab({ 
  features = [], 
  plans = [],
  onRefresh 
}) {
  const { showToast } = useToast();

  // Navigation View: 'catalog' (Main Features Catalog) | 'add_feature' (New Feature Page) | 'configure_feature' (Separate Page with 3 Options)
  const [currentView, setCurrentView] = useState('catalog');
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all'); // 'all' | 'write' | 'read' | 'none'
  const [groupByCategory, setGroupByCategory] = useState(false);

  // Custom added features (persisted in local storage)
  const [customFeatures, setCustomFeatures] = useState(() => {
    try {
      const saved = localStorage.getItem('kargoflow_custom_features');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Feature access overrides (Three options: write | read | none)
  const [featureModeOverrides, setFeatureModeOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('kargoflow_feature_mode_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Combined master features catalog
  const allFeatures = useMemo(() => {
    const list = [...customFeatures];
    const baseCatalog = (features && features.length > 0) ? features : ALL_PLATFORM_FEATURES;

    baseCatalog.forEach((item) => {
      const k = item.feature_key || item.key;
      if (!list.some((f) => (f.feature_key || f.key) === k)) {
        list.push({
          ...item,
          key: k,
          feature_key: k,
          name: item.name || k,
          category: item.category || 'Platform',
          description: item.description || 'Platform capability module.',
          defaultMode: item.defaultMode || 'write',
        });
      }
    });
    return list;
  }, [features, customFeatures]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(allFeatures.map((f) => f.category || 'General'));
    return Array.from(set).sort();
  }, [allFeatures]);

  // Helper: Get active access mode for feature (write | read | none)
  const getFeatureMode = (feat) => {
    const featKey = feat.feature_key || feat.key;
    if (featureModeOverrides[featKey]) {
      return featureModeOverrides[featKey];
    }
    return feat.defaultMode || 'write';
  };

  // Summary Metrics
  const stats = useMemo(() => {
    const total = allFeatures.length;
    const catCount = categories.length;
    let writeCount = 0;
    let readCount = 0;
    let noneCount = 0;

    allFeatures.forEach((f) => {
      const mode = getFeatureMode(f);
      if (mode === 'write') writeCount++;
      else if (mode === 'read') readCount++;
      else noneCount++;
    });

    return { total, catCount, writeCount, readCount, noneCount };
  }, [allFeatures, categories, featureModeOverrides]);

  // Filtered features list for table
  const filteredFeatures = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allFeatures.filter((feat) => {
      const matchesSearch = 
        !q ||
        (feat.name || '').toLowerCase().includes(q) ||
        (feat.description || '').toLowerCase().includes(q) ||
        (feat.category || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (categoryFilter !== 'all' && (feat.category || '') !== categoryFilter) return false;

      const currentMode = getFeatureMode(feat);
      if (accessFilter !== 'all' && currentMode !== accessFilter) return false;

      return true;
    });
  }, [allFeatures, search, categoryFilter, accessFilter, featureModeOverrides]);

  // Grouped by Category map
  const groupedFeatures = useMemo(() => {
    const map = {};
    filteredFeatures.forEach((feat) => {
      const cat = feat.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(feat);
    });
    return map;
  }, [filteredFeatures]);

  // =========================================================================
  // VIEW 2: SEPARATE PAGE - ADD NEW FEATURE MODULE
  // =========================================================================
  const [newFeature, setNewFeature] = useState({
    name: '',
    key: '',
    category: 'CRM',
    description: '',
    defaultMode: 'write',
  });
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const handleNameChange = (nameVal) => {
    const keyVal = nameVal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    setNewFeature((prev) => ({
      ...prev,
      name: nameVal,
      key: prev.key === '' || prev.key === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') ? keyVal : prev.key,
    }));
  };

  const handleOpenAddFeaturePage = () => {
    setNewFeature({
      name: '',
      key: '',
      category: categories[0] || 'CRM',
      description: '',
      defaultMode: 'write',
    });
    setCustomCategoryInput('');
    setCurrentView('add_feature');
  };

  const handleSaveNewFeature = (e) => {
    e.preventDefault();
    if (!newFeature.name.trim()) {
      showToast('Feature display name is required.', 'warning');
      return;
    }
    const finalKey = (newFeature.key || newFeature.name)
      .toLowerCase()
      .replace(/[^a-z0-9_.]+/g, '_')
      .trim();

    if (!finalKey) {
      showToast('A valid feature identifier key is required.', 'warning');
      return;
    }

    if (allFeatures.some((f) => (f.feature_key || f.key) === finalKey)) {
      showToast(`Feature key "${finalKey}" already exists in the catalog.`, 'warning');
      return;
    }

    const finalCategory = customCategoryInput.trim() || newFeature.category || 'Platform';

    const created = {
      id: `feat-${Date.now()}`,
      key: finalKey,
      feature_key: finalKey,
      name: newFeature.name.trim(),
      category: finalCategory,
      description: newFeature.description.trim() || 'Custom platform capability module.',
      defaultMode: newFeature.defaultMode,
      isCustom: true,
      created_at: new Date().toISOString(),
    };

    const updated = [created, ...customFeatures];
    setCustomFeatures(updated);
    try {
      localStorage.setItem('kargoflow_custom_features', JSON.stringify(updated));
    } catch {
      // Ignore
    }

    showToast(`Feature "${created.name}" added to catalog!`, 'success');
    setCurrentView('catalog');
  };

  // =========================================================================
  // VIEW 3: SEPARATE PAGE - CONFIGURE & ENABLE FEATURE (THREE OPTIONS)
  // =========================================================================
  const [editFeatureForm, setEditFeatureForm] = useState({
    name: '',
    key: '',
    category: '',
    description: '',
    defaultMode: 'write',
    isCustom: false,
  });

  const handleOpenConfigurePage = (feat) => {
    setSelectedFeature(feat);
    setEditFeatureForm({
      name: feat.name || '',
      key: feat.feature_key || feat.key || '',
      category: feat.category || 'General',
      description: feat.description || '',
      defaultMode: getFeatureMode(feat),
      isCustom: !!feat.isCustom,
    });
    setCurrentView('configure_feature');
  };

  const handleSaveConfiguredFeature = (e) => {
    e.preventDefault();
    if (!editFeatureForm.name.trim()) {
      showToast('Feature display name is required.', 'warning');
      return;
    }

    const featKey = editFeatureForm.key;
    const selectedMode = editFeatureForm.defaultMode;

    // 1. Update feature mode overrides
    setFeatureModeOverrides((prev) => {
      const updated = { ...prev, [featKey]: selectedMode };
      try {
        localStorage.setItem('kargoflow_feature_mode_overrides', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // 2. If custom module, update customFeatures
    if (editFeatureForm.isCustom) {
      const updatedCustom = customFeatures.map((cf) => {
        if ((cf.feature_key || cf.key) === featKey) {
          return {
            ...cf,
            name: editFeatureForm.name.trim(),
            category: editFeatureForm.category,
            description: editFeatureForm.description.trim(),
            defaultMode: selectedMode,
          };
        }
        return cf;
      });
      setCustomFeatures(updatedCustom);
      try {
        localStorage.setItem('kargoflow_custom_features', JSON.stringify(updatedCustom));
      } catch {
        // ignore
      }
    }

    const modeLabels = {
      write: 'Full (Write)',
      read: 'Read-Only',
      none: 'None (Disabled)',
    };

    showToast(`Feature "${editFeatureForm.name}" set to ${modeLabels[selectedMode]}!`, 'success');
    setCurrentView('catalog');
  };

  const handleDeleteCustomFeature = () => {
    if (!selectedFeature?.isCustom) return;
    const featKey = selectedFeature.feature_key || selectedFeature.key;
    const nextCustom = customFeatures.filter((f) => (f.feature_key || f.key) !== featKey);
    setCustomFeatures(nextCustom);
    try {
      localStorage.setItem('kargoflow_custom_features', JSON.stringify(nextCustom));
    } catch {
      // ignore
    }
    showToast(`Custom feature "${selectedFeature.name}" deleted.`, 'info');
    setCurrentView('catalog');
  };

  // =========================================================================
  // RENDER SEPARATE PAGE: ADD FEATURE
  // =========================================================================
  if (currentView === 'add_feature') {
    return (
      <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-150">
        {/* Header Bar with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('catalog')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              title="Back to Features Catalog"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => setCurrentView('catalog')}>Features Catalog</span>
                <span>/</span>
                <span className="text-slate-600 dark:text-slate-300 font-semibold">New Feature</span>
              </nav>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Add New Feature Module
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define an atomic capability module and select access permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentView('catalog')}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNewFeature}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Check size={14} />
              <span>Save & Add Feature</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveNewFeature} className="space-y-4">
          {/* Card: Enable Features of Three Options */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Access Authorization (Select One of Three Options)
              </h3>
            </div>

            {/* Three Options Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Option 1: Full (Write) */}
              <div
                onClick={() => setNewFeature({ ...newFeature, defaultMode: 'write' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  newFeature.defaultMode === 'write'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-2xs">
                    <Check size={14} className="stroke-[3]" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    newFeature.defaultMode === 'write' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {newFeature.defaultMode === 'write' ? 'Selected' : 'Option 1'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Full (Write)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Complete read, write, create, update, and administrative execution enabled.
                  </p>
                </div>
              </div>

              {/* Option 2: Read-Only */}
              <div
                onClick={() => setNewFeature({ ...newFeature, defaultMode: 'read' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  newFeature.defaultMode === 'read'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shadow-2xs">
                    <Eye size={14} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    newFeature.defaultMode === 'read' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {newFeature.defaultMode === 'read' ? 'Selected' : 'Option 2'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Read-Only</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Can inspect records and views without modification privileges.
                  </p>
                </div>
              </div>

              {/* Option 3: None (Disabled) */}
              <div
                onClick={() => setNewFeature({ ...newFeature, defaultMode: 'none' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  newFeature.defaultMode === 'none'
                    ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-slate-600 text-white flex items-center justify-center font-bold shadow-2xs">
                    <X size={14} className="stroke-[2.5]" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    newFeature.defaultMode === 'none' ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {newFeature.defaultMode === 'none' ? 'Selected' : 'Option 3'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">None (Disabled)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Feature module is completely locked, unenabled, and disabled.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Details */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Feature Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFeature.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. AI Dispatch Assistant"
                  className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Functional Category
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={newFeature.category}
                      onChange={(e) => setNewFeature({ ...newFeature, category: e.target.value })}
                      className="w-full pl-3 pr-7 py-2 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="custom">+ New Category...</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {newFeature.category === 'custom' && (
                    <input
                      type="text"
                      placeholder="Category name"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Feature Description
              </label>
              <textarea
                rows={2}
                value={newFeature.description}
                onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                placeholder="Describe what capabilities this module unlocks..."
                className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCurrentView('catalog')}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check size={14} />
              <span>Add Feature to Catalog</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // RENDER SEPARATE PAGE: CONFIGURE & ENABLE FEATURE (THREE OPTIONS)
  // =========================================================================
  if (currentView === 'configure_feature' && selectedFeature) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-150">
        {/* Header Bar with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('catalog')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              title="Back to Features Catalog"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => setCurrentView('catalog')}>Features Catalog</span>
                <span>/</span>
                <span className="text-slate-600 dark:text-slate-300 font-semibold">{editFeatureForm.name}</span>
              </nav>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Configure Feature: {editFeatureForm.name}
                </h1>
                {editFeatureForm.isCustom && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                    Custom Module
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enable or disable feature access by selecting one of the three options below.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {editFeatureForm.isCustom && (
              <button
                type="button"
                onClick={handleDeleteCustomFeature}
                className="px-3 py-2 border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCurrentView('catalog')}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveConfiguredFeature}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveConfiguredFeature} className="space-y-4">
          {/* Card: The Three Options (Main Feature Control) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enable Feature: Three Options</h3>
                  <p className="text-xs text-slate-400">Choose the authorization level for this feature capability</p>
                </div>
              </div>
            </div>

            {/* The Three Options: 3 Interactive Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Option 1: Full (Write) */}
              <div
                onClick={() => setEditFeatureForm({ ...editFeatureForm, defaultMode: 'write' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  editFeatureForm.defaultMode === 'write'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-2xs">
                    <Check size={14} className="stroke-[3]" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    editFeatureForm.defaultMode === 'write'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {editFeatureForm.defaultMode === 'write' ? 'Selected' : 'Option 1'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Full (Write)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Complete read, write, create, update, and administrative execution enabled.
                  </p>
                </div>
              </div>

              {/* Option 2: Read-Only */}
              <div
                onClick={() => setEditFeatureForm({ ...editFeatureForm, defaultMode: 'read' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  editFeatureForm.defaultMode === 'read'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shadow-2xs">
                    <Eye size={14} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    editFeatureForm.defaultMode === 'read'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {editFeatureForm.defaultMode === 'read' ? 'Selected' : 'Option 2'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Read-Only</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Can inspect data, views, and dashboards without modification or write privileges.
                  </p>
                </div>
              </div>

              {/* Option 3: None (Disabled) */}
              <div
                onClick={() => setEditFeatureForm({ ...editFeatureForm, defaultMode: 'none' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  editFeatureForm.defaultMode === 'none'
                    ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-slate-600 text-white flex items-center justify-center font-bold shadow-2xs">
                    <X size={14} className="stroke-[2.5]" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    editFeatureForm.defaultMode === 'none'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {editFeatureForm.defaultMode === 'none' ? 'Selected' : 'Option 3'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">None (Disabled)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Feature module is completely locked, inaccessible, and disabled.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Details */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Feature Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFeatureForm.name}
                  onChange={(e) => setEditFeatureForm({ ...editFeatureForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Functional Category
                </label>
                <div className="relative">
                  <select
                    value={editFeatureForm.category}
                    onChange={(e) => setEditFeatureForm({ ...editFeatureForm, category: e.target.value })}
                    className="w-full pl-3 pr-7 py-2 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Feature Description
              </label>
              <textarea
                rows={2}
                value={editFeatureForm.description}
                onChange={(e) => setEditFeatureForm({ ...editFeatureForm, description: e.target.value })}
                placeholder="Describe what capabilities this module unlocks..."
                className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCurrentView('catalog')}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save size={14} />
              <span>Save & Apply Changes</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: CLEAN CATALOG TABLE (COMPANY/PLAN COLUMNS REMOVED)
  // =========================================================================
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Page Header with Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <span>Platform Admin</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Features Catalog</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Features Catalog & Permissions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage platform capability modules and navigate to configure access with Full (Write), Read-Only, or Disabled options.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              title="Refresh feature catalog"
            >
              <RefreshCw size={14} />
            </button>
          )}

          {/* Add Feature Button */}
          <button
            type="button"
            onClick={handleOpenAddFeaturePage}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Feature</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Modules</span>
          <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">{stats.total}</span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Categories</span>
          <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 block">{stats.catCount}</span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Full (Write) Enabled</span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{stats.writeCount}</span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block">Read-Only</span>
          <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 block">{stats.readCount}</span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Disabled (None)</span>
          <span className="text-base font-black text-slate-600 dark:text-slate-300 mt-0.5 block">{stats.noneCount}</span>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features by name, category, or description..."
            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto pl-3 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs appearance-none cursor-pointer"
          >
            <option value="all">All Categories ({allFeatures.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Access Mode Filter */}
        <div className="relative">
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
            className="w-full sm:w-auto pl-3 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs appearance-none cursor-pointer"
          >
            <option value="all">All Access Modes</option>
            <option value="write">Full (Write) Only</option>
            <option value="read">Read-Only Only</option>
            <option value="none">Disabled (None) Only</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Group By Category Toggle */}
        <button
          type="button"
          onClick={() => setGroupByCategory((prev) => !prev)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
            groupByCategory
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
          }`}
          title="Toggle Category Grouping"
        >
          <Layers size={13} />
          <span>Group: <strong>{groupByCategory ? 'ON' : 'OFF'}</strong></span>
        </button>
      </div>

      {/* 4. Clean Table Without Company/Plan Columns */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[200px]">Feature Name</th>
                <th className="py-2.5 px-3 w-32">Category</th>
                <th className="py-2.5 px-4 min-w-[280px]">Description</th>
                <th className="py-2.5 px-3 text-center w-36">Access Mode</th>
                <th className="py-2.5 px-4 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No platform modules match the filter criteria.
                  </td>
                </tr>
              ) : groupByCategory ? (
                // Grouped by Category Mode
                Object.entries(groupedFeatures).map(([catName, items]) => (
                  <React.Fragment key={catName}>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-y border-slate-200/70 dark:border-slate-700/60">
                      <td colSpan={5} className="py-1.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                              {catName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({items.length} {items.length === 1 ? 'module' : 'modules'})
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                    {items.map((feat) => renderFeatureRow(feat))}
                  </React.Fragment>
                ))
              ) : (
                // Flat Table Rows
                filteredFeatures.map((feat) => renderFeatureRow(feat))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function renderFeatureRow(feat) {
    const featKey = feat.feature_key || feat.key;
    const currentMode = getFeatureMode(feat);

    return (
      <tr key={featKey} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
        {/* Feature Name */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenConfigurePage(feat)}
              className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
              title="Click to navigate to configuration page"
            >
              {feat.name}
            </button>
            {feat.isCustom && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50">
                Custom
              </span>
            )}
          </div>
        </td>

        {/* Category */}
        <td className="py-3 px-3">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {feat.category || 'General'}
          </span>
        </td>

        {/* Description */}
        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
          {feat.description}
        </td>

        {/* Access Status Badge (Three Options status) */}
        <td className="py-3 px-3 text-center whitespace-nowrap">
          {currentMode === 'write' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs">
              <Check size={12} className="stroke-[3]" />
              <span>Full (Write)</span>
            </span>
          ) : currentMode === 'read' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 shadow-2xs">
              <Eye size={12} />
              <span>Read-Only</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <X size={12} className="stroke-[2.5]" />
              <span>Disabled</span>
            </span>
          )}
        </td>

        {/* Action Button: Navigates into Separate Page */}
        <td className="py-3 px-4 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={() => handleOpenConfigurePage(feat)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Navigate to separate page to enable three options"
          >
            <Sliders size={12} />
            <span>Configure</span>
            <ArrowRight size={11} />
          </button>
        </td>
      </tr>
    );
  }
}
