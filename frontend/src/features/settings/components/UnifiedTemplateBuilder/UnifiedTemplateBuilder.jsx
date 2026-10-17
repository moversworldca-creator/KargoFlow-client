import React, { useState, useEffect, useCallback, useRef } from "react";
import TopNavbar from "./components/TopNavbar";
import LeftSidebar from "./components/LeftSidebar";
import RightPropertiesPanel from "./components/RightPropertiesPanel";
import DocumentCanvas from "./components/DocumentCanvas";
import HtmlCodeModal from "./modals/HtmlCodeModal";
import InsertTablePopup from "./modals/InsertTablePopup";
import InsertLayoutDialog from "./modals/InsertLayoutDialog";
import PreviewModal from "./modals/PreviewModal";
import TransferModal from "./modals/TransferModal";
import VersionHistoryModal from "./modals/VersionHistoryModal";
import CustomFieldModal from "./modals/CustomFieldModal";
import { getModeConfig } from "./config/modeRegistry";
import {
  createInitialDocument,
  createBlankDocument,
  createTableWidget,
  createContentLayoutWidget,
  createHtmlWidget,
  createWidget,
  duplicateItem,
  createId,
  validateTemplateDocument,
  deepClone,
} from "./model/templateModel";
import { compileDocumentToHtml } from "./model/htmlCompiler";
import {
  saveDocument,
  saveLibrary,
  loadLibrarySync,
} from "./core/storageService";

export default function UnifiedTemplateBuilder({
  mode = "estimate",
  template,
  draft,
  value,
  onChange,
  onSave,
  onBack,
  branchId,
  branches,
  isOverlay = true,
  visualInsertRequest = null,
}) {
  const modeConfig = getModeConfig(mode);
  const initialSource = draft || template;

  // Template Document Model
  const [doc, setDoc] = useState(() => {
    let initial;
    if (initialSource && typeof initialSource === "object") {
      if (initialSource.items && Array.isArray(initialSource.items) && initialSource.items.length > 0) {
        initial = initialSource;
      } else if (initialSource.content && typeof initialSource.content === "object" && Array.isArray(initialSource.content.items) && initialSource.content.items.length > 0) {
        initial = initialSource.content;
      }
    }
    if (!initial) {
      const existingEmailHtml = initialSource?.body_html || initialSource?.html_content || (mode === "email" ? initialSource?.body : "");
      if (mode === "email" && existingEmailHtml) {
        initial = createBlankDocument("A4", "Portrait");
        initial.name = initialSource?.name || "Email Template";
        const emailWidget = createHtmlWidget(existingEmailHtml, initialSource?.body_css || "", "Email Content");
        initial.items = [emailWidget];
        initial.pages = [{ id: "page-1", name: "Page 1", items: [emailWidget] }];
      } else {
        initial = createInitialDocument(mode);
      }
    }

    // Ensure pages exist
    if (!initial.pages || !Array.isArray(initial.pages) || initial.pages.length === 0) {
      initial = {
        ...initial,
        pages: [{ id: "page-1", name: "Page 1", items: initial.items || [] }],
      };
    }
    initial.settings = {
      ...(initial.settings || {}),
      subject: initialSource?.subject || initial.settings?.subject || "",
      template_key: initialSource?.template_key || initial.settings?.template_key || "",
      branch: initialSource?.branch || branchId || initial.settings?.branch || null,
      category: initialSource?.category || initial.settings?.category || (mode === "email" ? "Email" : mode === "sms" ? "SMS" : "Estimate"),
    };
    return initial;
  });

  const [smsText, setSmsText] = useState(() => {
    return initialSource?.body_sms || initialSource?.sms_body || initialSource?.body || (typeof value === "string" ? value : "") || "";
  });

  useEffect(() => {
    const nextSms = initialSource?.body_sms || initialSource?.sms_body || initialSource?.body || (typeof value === "string" ? value : "") || "";
    if (nextSms && nextSms !== smsText) {
      setSmsText(nextSms);
    }
  }, [initialSource?.body_sms, initialSource?.sms_body, initialSource?.body, value]);

  // Editor State
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selection, setSelection] = useState(null);
  const [resolveVariables, setResolveVariables] = useState(false);
  const [activeHtmlItem, setActiveHtmlItem] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [devicePreview, setDevicePreview] = useState("desktop");
  const [pageSize, setPageSize] = useState(modeConfig.defaultPageSize || "A4");
  const [orientation, setOrientation] = useState(modeConfig.defaultOrientation || "Portrait");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // History Stack for Undo/Redo
  const [history, setHistory] = useState(() => [deepClone(doc)]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Template Library Shelf (up to 25 templates)
  const [library, setLibrary] = useState(() => loadLibrarySync());

  // Modals
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isTablePopupOpen, setIsTablePopupOpen] = useState(false);
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCustomFieldModalOpen, setIsCustomFieldModalOpen] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const importInputRef = useRef(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Export Document Schema to JSON File
  const handleExportJson = useCallback(() => {
    try {
      const payload = {
        ...deepClone(doc),
        updatedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${doc.name?.trim().replace(/[^a-z0-9-_]+/gi, "-") || "kargoflow-template"}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToastMessage("Template schema successfully exported as JSON");
    } catch (err) {
      console.error("Export error:", err);
      setToastMessage("Failed to export template as JSON");
    }
  }, [doc]);

  // Import Document Schema from JSON File
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File exceeds 2 MB maximum limit");
      }
      const text = await file.text();
      const parsed = JSON.parse(text);
      const errors = validateTemplateDocument(parsed);
      if (errors.length > 0) {
        throw new Error(errors.slice(0, 3).join("; "));
      }
      const importedDoc = {
        ...deepClone(parsed),
        pages:
          parsed.pages && Array.isArray(parsed.pages) && parsed.pages.length > 0
            ? parsed.pages
            : [{ id: "page-1", name: "Page 1", items: parsed.items || [] }],
        updatedAt: new Date().toISOString(),
      };
      updateDoc(importedDoc);
      setSelectedItemId(null);
      setToastMessage("Template successfully imported");
    } catch (err) {
      console.error("Import error:", err);
      setToastMessage(err instanceof Error ? err.message : "Failed to import template file");
    }
  };

  // Create Named Version Snapshot
  const handleCreateSnapshot = (name) => {
    const snap = {
      id: createId("snap"),
      name,
      timestamp: Date.now(),
      doc: deepClone(doc),
    };
    setSnapshots((prev) => [snap, ...prev]);
    setToastMessage(`Snapshot "${name}" saved`);
  };

  // Restore Snapshot
  const handleRestoreSnapshot = (snapshotDoc) => {
    updateDoc(deepClone(snapshotDoc));
    setSelectedItemId(null);
    setToastMessage("Restored version snapshot");
  };

  // Direct Print / PDF Trigger
  const handleDirectPrint = () => {
    let pageStyle = window.document.getElementById("kargoflow-print-page");
    if (!pageStyle) {
      pageStyle = window.document.createElement("style");
      pageStyle.id = "kargoflow-print-page";
      window.document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `
      @page {
        size: ${pageSize} ${orientation.toLowerCase()};
        margin: 12mm;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        .page-break-avoid { break-inside: avoid; page-break-inside: avoid; }
      }
    `;
    window.print();
  };

  // Push history on changes
  const updateDoc = useCallback(
    (newDoc, markDirty = true) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIdx + 1);
        next.push(deepClone(newDoc));
        return next;
      });
      setHistoryIdx((prev) => prev + 1);
      setDoc(newDoc);
      if (markDirty) setIsDirty(true);

      if (onChange) {
        const compiledHtml = compileDocumentToHtml(newDoc, mode);
        onChange({
          ...(initialSource || {}),
          name: newDoc.name,
          content: newDoc,
          html_content: compiledHtml,
          body_html: compiledHtml,
          body_sms: smsText,
          subject: newDoc.settings?.subject || initialSource?.subject || "",
          template_key: newDoc.settings?.template_key || initialSource?.template_key || "",
          branch: newDoc.settings?.branch || initialSource?.branch || branchId || null,
          category: newDoc.settings?.category || initialSource?.category || null,
        });
      }
    },
    [historyIdx, onChange, mode, initialSource, smsText, branchId]
  );

  const handleSmsChange = useCallback(
    (text) => {
      setSmsText(text);
      setIsDirty(true);
      if (onChange) {
        onChange({
          ...(initialSource || {}),
          name: doc.name,
          content: doc,
          body_sms: text,
          body: text,
          sms_body: text,
          subject: doc.settings?.subject || initialSource?.subject || "",
          template_key: doc.settings?.template_key || initialSource?.template_key || "",
          branch: doc.settings?.branch || initialSource?.branch || branchId || null,
          category: doc.settings?.category || initialSource?.category || null,
        });
      }
    },
    [onChange, initialSource, doc, branchId]
  );

  const handleUndo = () => {
    if (historyIdx > 0 && history[historyIdx - 1]) {
      const prevIdx = historyIdx - 1;
      const targetDoc = deepClone(history[prevIdx]);
      setHistoryIdx(prevIdx);
      setDoc(targetDoc);
    }
  };

  const handleRedo = () => {
    if (historyIdx + 1 < history.length && history[historyIdx + 1]) {
      const nextIdx = historyIdx + 1;
      const targetDoc = deepClone(history[nextIdx]);
      setHistoryIdx(nextIdx);
      setDoc(targetDoc);
    }
  };

  // Orientation Toggle Handler
  const handleToggleOrientation = () => {
    const next = orientation === "Landscape" ? "Portrait" : "Landscape";
    setOrientation(next);
    updateDoc({
      ...doc,
      settings: {
        ...(doc.settings || {}),
        orientation: next,
      },
    });
    setToastMessage(`Orientation: ${next}`);
  };

  // Helper: Get or Init current pages
  const getCurrentPages = useCallback(() => {
    if (doc.pages && Array.isArray(doc.pages) && doc.pages.length > 0) {
      return [...doc.pages];
    }
    return [{ id: "page-1", name: "Page 1", items: [...(doc.items || [])] }];
  }, [doc.pages, doc.items]);

  // Widget Actions
  const handleAddWidget = (widgetConfig) => {
    if (widgetConfig.type === "custom_field" || widgetConfig.id === "custom_field") {
      setIsCustomFieldModalOpen(true);
      return;
    }
    const newItem = createWidget(widgetConfig.label || widgetConfig.type);
    const pages = getCurrentPages();
    const lastIdx = pages.length - 1;
    pages[lastIdx] = {
      ...pages[lastIdx],
      items: [...(pages[lastIdx].items || []), newItem],
    };
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
    setSelectedItemId(newItem.id);
  };

  const handleInsertCustomField = ({ label, value: val, variable }) => {
    const customItem = createWidget("Custom Field", {
      fieldLabel: label,
      value: val,
      variable,
    });
    const pages = getCurrentPages();
    const lastIdx = pages.length - 1;
    pages[lastIdx] = {
      ...pages[lastIdx],
      items: [...(pages[lastIdx].items || []), customItem],
    };
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
    setSelectedItemId(customItem.id);
    setToastMessage(`Added Custom Field: ${label}`);
  };

  const handleInsertTable = (rows, cols) => {
    const tableItem = createTableWidget(rows, cols, "");
    const pages = getCurrentPages();
    const lastIdx = pages.length - 1;
    pages[lastIdx] = {
      ...pages[lastIdx],
      items: [...(pages[lastIdx].items || []), tableItem],
    };
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
    setSelectedItemId(tableItem.id);
  };

  const handleInsertLayout = (preset) => {
    const layoutItem = createContentLayoutWidget(preset, 1, 2, "Content Layout");
    const pages = getCurrentPages();
    const lastIdx = pages.length - 1;
    pages[lastIdx] = {
      ...pages[lastIdx],
      items: [...(pages[lastIdx].items || []), layoutItem],
    };
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
    setSelectedItemId(layoutItem.id);
  };

  // Direct Creation on Page (Mouse Drag or Click on Blank Canvas)
  const handleDirectCreateItem = (itemConfig = {}, pageIndex = 0) => {
    const defaultLabel = itemConfig.label || itemConfig.type || "Text Block";
    const newItem = createWidget(defaultLabel, itemConfig);
    const pages = getCurrentPages();
    const safePageIndex = Math.max(0, Math.min(pages.length - 1, pageIndex));
    const targetItems = [...(pages[safePageIndex]?.items || [])];
    targetItems.push(newItem);
    pages[safePageIndex] = {
      ...pages[safePageIndex],
      items: targetItems,
    };
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
    setSelectedItemId(newItem.id);
    setToastMessage(`Created ${newItem.label || "Text Box"}`);
    return newItem;
  };

  // Drag and Drop Handler: Inserts new widgets or moves existing blocks to exact page and index
  const handleDropInPage = (event, pageIndex, itemIndex) => {
    event.preventDefault();
    const widgetRaw = event.dataTransfer.getData("widget");
    const itemId = event.dataTransfer.getData("itemId");
    const variable = event.dataTransfer.getData("variable");

    const pages = getCurrentPages();
    const safePageIndex = Math.max(0, Math.min(pages.length - 1, pageIndex));

    if (variable) {
      handleInsertVariable(variable);
      setToastMessage(`Inserted variable: ${variable}`);
      return;
    }

    if (widgetRaw) {
      let widgetConfig;
      try {
        widgetConfig = JSON.parse(widgetRaw);
      } catch {
        widgetConfig = { label: widgetRaw, type: widgetRaw };
      }

      if (widgetConfig.type === "custom_field" || widgetConfig.id === "custom_field") {
        setIsCustomFieldModalOpen(true);
        return;
      }
      if (widgetConfig.type === "table") {
        setIsTablePopupOpen(true);
        return;
      }
      if (widgetConfig.type === "layout") {
        setIsLayoutDialogOpen(true);
        return;
      }

      const newItem = createWidget(widgetConfig.label || widgetConfig.type);
      const targetItems = [...(pages[safePageIndex].items || [])];
      const safeInsertIndex = Math.max(0, Math.min(targetItems.length, itemIndex));
      targetItems.splice(safeInsertIndex, 0, newItem);

      pages[safePageIndex] = {
        ...pages[safePageIndex],
        items: targetItems,
      };

      const nextItems = pages.flatMap((p) => p.items);
      updateDoc({ ...doc, pages, items: nextItems });
      setSelectedItemId(newItem.id);
      setToastMessage(`Added ${widgetConfig.label || "widget"}`);
      return;
    }

    if (itemId) {
      // Find source page and item index
      let srcPageIdx = -1;
      let srcItemIdx = -1;
      pages.forEach((page, pIdx) => {
        const iIdx = (page.items || []).findIndex((it) => it.id === itemId);
        if (iIdx >= 0) {
          srcPageIdx = pIdx;
          srcItemIdx = iIdx;
        }
      });

      if (srcPageIdx >= 0 && srcItemIdx >= 0) {
        const sourceItem = pages[srcPageIdx].items[srcItemIdx];
        const nextPages = pages.map((page) => ({
          ...page,
          items: [...(page.items || [])],
        }));

        nextPages[srcPageIdx].items.splice(srcItemIdx, 1);
        const destInsertIdx =
          srcPageIdx === safePageIndex && itemIndex > srcItemIdx
            ? itemIndex - 1
            : Math.max(0, Math.min(nextPages[safePageIndex].items.length, itemIndex));

        nextPages[safePageIndex].items.splice(destInsertIdx, 0, sourceItem);
        const nextItems = nextPages.flatMap((page) => page.items);
        updateDoc({
          ...doc,
          pages: nextPages,
          items: nextItems,
        });
        setSelectedItemId(sourceItem.id);
        setToastMessage(`Moved ${sourceItem.label || "component"}`);
      }
    }
  };

  const handleInsertVariable = (tag) => {
    if (mode === "sms") {
      handleSmsChange(smsText ? `${smsText} ${tag}` : tag);
      return;
    }

    if (selectedItemId) {
      const selected = (doc.items || []).find((it) => it.id === selectedItemId);
      if (selected) {
        const updated = {
          ...selected,
          content: `${selected.content || ""} ${tag}`,
          htmlContent: selected.htmlContent ? `${selected.htmlContent} ${tag}` : undefined,
        };
        handleUpdateItem(updated);
        return;
      }
    }

    const firstBlock = (doc.items || []).find((it) => it.type === "html" || it.type === "typography" || it.type === "meta");
    if (firstBlock) {
      const updated = {
        ...firstBlock,
        content: `${firstBlock.content || ""} ${tag}`,
        htmlContent: firstBlock.htmlContent ? `${firstBlock.htmlContent} ${tag}` : undefined,
      };
      handleUpdateItem(updated);
    } else {
      handleInsertCustomField({ label: "Variable", value: tag, variable: tag });
    }
  };

  useEffect(() => {
    if (visualInsertRequest?.token) {
      handleInsertVariable(visualInsertRequest.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualInsertRequest]);

  const handleUpdateItem = (updatedItem) => {
    const pages = getCurrentPages().map((page) => ({
      ...page,
      items: (page.items || []).map((it) =>
        it.id === updatedItem.id ? updatedItem : it
      ),
    }));
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
  };

  const handleDeleteItem = (itemId) => {
    const pages = getCurrentPages().map((page) => ({
      ...page,
      items: (page.items || []).filter((it) => it.id !== itemId),
    }));
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
    if (selectedItemId === itemId) setSelectedItemId(null);
  };

  const handleDuplicateItem = (item) => {
    const duplicated = duplicateItem(item);
    const pages = getCurrentPages();
    let placed = false;
    for (let i = 0; i < pages.length; i++) {
      const idx = pages[i].items.findIndex((it) => it.id === item.id);
      if (idx !== -1) {
        pages[i].items.splice(idx + 1, 0, duplicated);
        placed = true;
        break;
      }
    }
    if (!placed) {
      pages[pages.length - 1].items.push(duplicated);
    }
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
    setSelectedItemId(duplicated.id);
  };

  const handleMoveItem = (itemId, direction) => {
    const pages = getCurrentPages();
    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const items = pages[pIdx].items || [];
      const itemIdx = items.findIndex((it) => it.id === itemId);
      if (itemIdx !== -1) {
        const targetIdx = direction === "up" ? itemIdx - 1 : itemIdx + 1;
        if (targetIdx >= 0 && targetIdx < items.length) {
          const nextItems = [...items];
          const temp = nextItems[itemIdx];
          nextItems[itemIdx] = nextItems[targetIdx];
          nextItems[targetIdx] = temp;
          pages[pIdx].items = nextItems;
          const allItems = pages.flatMap((p) => p.items);
          updateDoc({ ...doc, pages, items: allItems });
          return;
        }
      }
    }
  };

  const handleToggleItemVisibility = (itemId) => {
    const pages = getCurrentPages().map((page) => ({
      ...page,
      items: (page.items || []).map((it) =>
        it.id === itemId ? { ...it, visible: it.visible === false ? true : false } : it
      ),
    }));
    const nextItems = pages.flatMap((p) => p.items);
    updateDoc({ ...doc, pages, items: nextItems });
  };

  // Multi-Page Handlers
  const handleAddPage = () => {
    const pages = getCurrentPages();
    const newPageNum = pages.length + 1;
    const newPage = {
      id: createId("page"),
      name: `Page ${newPageNum}`,
      items: [],
    };
    const nextPages = [...pages, newPage];
    updateDoc({
      ...doc,
      pages: nextPages,
      items: nextPages.flatMap((p) => p.items),
    });
    setToastMessage(`Added Page ${newPageNum}`);
  };

  const handleAddPageBefore = (index) => {
    const pages = getCurrentPages();
    const newPage = {
      id: createId("page"),
      name: `Page ${index + 1}`,
      items: [],
    };
    pages.splice(index, 0, newPage);
    const reindexed = pages.map((p, idx) => ({ ...p, name: `Page ${idx + 1}` }));
    updateDoc({
      ...doc,
      pages: reindexed,
      items: reindexed.flatMap((p) => p.items),
    });
    setToastMessage("Inserted page before");
  };

  const handleAddPageAfter = (index) => {
    const pages = getCurrentPages();
    const newPage = {
      id: createId("page"),
      name: `Page ${index + 2}`,
      items: [],
    };
    pages.splice(index + 1, 0, newPage);
    const reindexed = pages.map((p, idx) => ({ ...p, name: `Page ${idx + 1}` }));
    updateDoc({
      ...doc,
      pages: reindexed,
      items: reindexed.flatMap((p) => p.items),
    });
    setToastMessage("Inserted page after");
  };

  const handleDuplicatePage = (index) => {
    const pages = getCurrentPages();
    const targetPage = pages[index];
    if (!targetPage) return;
    const duplicatedItems = (targetPage.items || []).map((it) => duplicateItem(it));
    const duplicatedPage = {
      id: createId("page"),
      name: `${targetPage.name || `Page ${index + 1}`} (Copy)`,
      items: duplicatedItems,
    };
    pages.splice(index + 1, 0, duplicatedPage);
    updateDoc({
      ...doc,
      pages,
      items: pages.flatMap((p) => p.items),
    });
    setToastMessage("Duplicated page");
  };

  const handleDeletePage = (index) => {
    const pages = getCurrentPages();
    if (pages.length <= 1) return;
    pages.splice(index, 1);
    const reindexed = pages.map((p, idx) => ({ ...p, name: `Page ${idx + 1}` }));
    updateDoc({
      ...doc,
      pages: reindexed,
      items: reindexed.flatMap((p) => p.items),
    });
    setToastMessage(`Deleted page ${index + 1}`);
  };

  const handleMovePage = (index, direction) => {
    const pages = getCurrentPages();
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    const temp = pages[index];
    pages[index] = pages[targetIndex];
    pages[targetIndex] = temp;
    updateDoc({
      ...doc,
      pages,
      items: pages.flatMap((p) => p.items),
    });
  };

  // Template Library Shelf Handlers
  const handleSaveToLibrary = async (targetDoc = doc) => {
    try {
      const nextLibrary = [
        { ...deepClone(targetDoc), updatedAt: new Date().toISOString() },
        ...library.filter((it) => (it.id ? it.id !== targetDoc.id : it.name !== targetDoc.name)),
      ].slice(0, 25);
      setLibrary(nextLibrary);
      await saveLibrary(nextLibrary);
    } catch (err) {
      console.error("Save to library error:", err);
    }
  };

  const handleLoadFromLibrary = (templateDoc) => {
    const loaded = deepClone(templateDoc);
    if (!loaded.pages || !Array.isArray(loaded.pages) || loaded.pages.length === 0) {
      loaded.pages = [{ id: "page-1", name: "Page 1", items: loaded.items || [] }];
    }
    updateDoc(loaded);
    if (loaded.settings?.pageSize) setPageSize(loaded.settings.pageSize);
    if (loaded.settings?.orientation) setOrientation(loaded.settings.orientation);
    setSelectedItemId(null);
    setToastMessage(`Loaded "${loaded.name}" from template library`);
  };

  const handleDeleteFromLibrary = async (targetIdOrName) => {
    const nextLibrary = library.filter(
      (it) => it.id !== targetIdOrName && it.name !== targetIdOrName
    );
    setLibrary(nextLibrary);
    await saveLibrary(nextLibrary);
    setToastMessage("Removed template from library");
  };

  // Save Handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const compiledHtml = compileDocumentToHtml(doc, mode);
      const payload = {
        name: doc.name,
        mode,
        content: doc,
        html_content: compiledHtml,
        body_html: compiledHtml,
        body_sms: smsText,
        pageSize,
        orientation,
        subject: doc.settings?.subject || initialSource?.subject || "",
        template_key: doc.settings?.template_key || initialSource?.template_key || "",
        branch: doc.settings?.branch || initialSource?.branch || branchId || null,
        category: doc.settings?.category || initialSource?.category || null,
      };

      await handleSaveToLibrary(doc);
      await saveDocument(doc);

      if (onSave) {
        await onSave(payload);
      }
      setIsDirty(false);
      setToastMessage("Template saved successfully");
    } catch (err) {
      console.error("Save error:", err);
      setToastMessage("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  // Draft Save Handler
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const compiledHtml = compileDocumentToHtml(doc, mode);
      const payload = {
        name: doc.name,
        mode,
        content: doc,
        html_content: compiledHtml,
        body_html: compiledHtml,
        body_sms: smsText,
        pageSize,
        orientation,
        subject: doc.settings?.subject || initialSource?.subject || "",
        template_key: doc.settings?.template_key || initialSource?.template_key || "",
        branch: doc.settings?.branch || initialSource?.branch || branchId || null,
        category: doc.settings?.category || initialSource?.category || null,
        is_draft: true,
      };

      await handleSaveToLibrary({ ...doc, name: `${doc.name} (Draft)` });
      await saveDocument(doc);

      if (onSave) {
        await onSave(payload);
      }
      setIsDirty(false);
      setToastMessage("Draft saved successfully");
    } catch (err) {
      console.error("Draft error:", err);
      setToastMessage("Draft saved to local storage");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedItem = (doc.items || []).find((it) => it.id === selectedItemId);

  return (
    <div className={`flex flex-col bg-slate-100 overflow-hidden text-slate-800 ${isOverlay ? "fixed inset-0 z-[70000] w-screen h-screen" : "w-full h-full"}`}>
      {/* Top Navbar */}
      <TopNavbar
        title={doc.name}
        onTitleChange={(name) => updateDoc({ ...doc, name })}
        canUndo={historyIdx > 0}
        canRedo={historyIdx + 1 < history.length}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onSaveDraft={handleSaveDraft}
        onBack={onBack}
        onOpenCode={() => {
          setActiveHtmlItem(null);
          setIsCodeModalOpen(true);
        }}
        onOpenPreview={() => setIsPreviewOpen(true)}
        mode={mode}
        modeConfig={modeConfig}
        onOpenTransfer={() => setIsTransferModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onPrint={handleDirectPrint}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isPanelOpen={isPanelOpen}
        onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
      />

      {/* Main Workspace (Left Sidebar + Center Canvas + Right Inspector) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop Overlay when Sidebar is open */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}

        {/* Collapsible Left Toolkit Sidebar */}
        <div className={`${isSidebarOpen ? "block" : "hidden"} shrink-0 z-30 transition-all duration-200`}>
          <LeftSidebar
            mode={mode}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            orientation={orientation}
            onOrientationChange={setOrientation}
            category={doc.settings?.category || "Estimate"}
            onCategoryChange={(cat) =>
              updateDoc({
                ...doc,
                settings: { ...(doc.settings || {}), category: cat },
              })
            }
            library={library}
            onLoadFromLibrary={handleLoadFromLibrary}
            onDeleteFromLibrary={handleDeleteFromLibrary}
            onAddWidget={handleAddWidget}
            onInsertTable={() => setIsTablePopupOpen(true)}
            onInsertLayout={() => setIsLayoutDialogOpen(true)}
            onInsertVariable={handleInsertVariable}
            onOpenCustomFieldDialog={() => setIsCustomFieldModalOpen(true)}
            templateSettings={{
              subject: doc.settings?.subject || "",
              template_key: doc.settings?.template_key || "",
              branch: doc.settings?.branch || null,
              category: doc.settings?.category || "",
            }}
            onTemplateSettingsChange={(patch) =>
              updateDoc({
                ...doc,
                settings: { ...(doc.settings || {}), ...patch },
              })
            }
            branches={branches || []}
          />
        </div>

        {/* Center Document Canvas with Secondary Toolbar & Multi-Page Engine */}
        <DocumentCanvas
          items={doc.items || []}
          pages={doc.pages || []}
          selectedItemId={selectedItemId}
          selectedItem={selectedItem}
          documentSettings={doc.settings || {}}
          onUpdateDocumentSettings={(settings) => updateDoc({ ...doc, settings })}
          onSelectItem={(id) => {
            setSelectedItemId(id);
            setSelection({ itemId: id, part: null });
            if (typeof window !== "undefined" && window.innerWidth < 1280) {
              setIsPanelOpen(true);
            }
          }}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onDuplicateItem={handleDuplicateItem}
          mode={mode}
          modeConfig={modeConfig}
          zoom={zoom}
          onZoomChange={setZoom}
          devicePreview={devicePreview}
          onDevicePreviewChange={setDevicePreview}
          pageSize={pageSize}
          orientation={orientation}
          smsText={smsText}
          onSmsTextChange={handleSmsChange}
          preview={false}
          resolveVariables={resolveVariables}
          selection={selection}
          onSelectPart={(part) => setSelection({ itemId: selectedItemId, part })}
          onOpenHtmlEditor={(item) => {
            setActiveHtmlItem(item || null);
            setIsCodeModalOpen(true);
          }}
          onToggleOrientation={handleToggleOrientation}
          onAddPage={handleAddPage}
          onAddPageBefore={handleAddPageBefore}
          onAddPageAfter={handleAddPageAfter}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onMovePage={handleMovePage}
          onAddWidgetClick={(w) => handleAddWidget(w)}
          onInsertTable={() => setIsTablePopupOpen(true)}
          onInsertLayout={() => setIsLayoutDialogOpen(true)}
          onOpenCustomFieldDialog={() => setIsCustomFieldModalOpen(true)}
          onDropInPage={handleDropInPage}
          onMoveItemUp={(id) => handleMoveItem(id, "up")}
          onMoveItemDown={(id) => handleMoveItem(id, "down")}
          onToggleItemVisibility={handleToggleItemVisibility}
          onDirectCreateItem={handleDirectCreateItem}
        />

        {/* Right Inspector Panel: Static in xl (>=1280px), Drawer below xl */}
        {/* Drawer Backdrop Overlay for screens < 1280px */}
        {isPanelOpen && (
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-40 xl:hidden"
            onClick={() => setIsPanelOpen(false)}
            aria-label="Close properties panel overlay"
          />
        )}

        <div
          className={`shrink-0 z-40 transition-transform duration-200 xl:translate-x-0 ${
            isPanelOpen
              ? "fixed right-0 top-14 bottom-0 shadow-2xl xl:static xl:shadow-none translate-x-0"
              : "fixed right-0 top-14 bottom-0 translate-x-full xl:static xl:translate-x-0"
          }`}
        >
          <RightPropertiesPanel
            selectedItem={selectedItem}
            selection={selection}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={() => handleDeleteItem(selectedItemId)}
            onDuplicateItem={() => handleDuplicateItem(selectedItem)}
            documentSettings={doc.settings}
            onUpdateDocumentSettings={(settings) => updateDoc({ ...doc, settings })}
            docName={doc.name}
            onUpdateDocName={(name) => updateDoc({ ...doc, name })}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            orientation={orientation}
            onOrientationChange={setOrientation}
            mode={mode}
            branches={branches || []}
            smsText={smsText}
            devicePreview={devicePreview}
            onClosePanel={() => setIsPanelOpen(false)}
          />
        </div>
      </div>

      {/* Hidden File Input for JSON Schema Import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[80000] bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="text-slate-400 hover:text-white p-0.5 rounded transition ml-1"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Reusable Dialog Modals */}
      <HtmlCodeModal
        isOpen={isCodeModalOpen}
        initialHtml={activeHtmlItem ? (activeHtmlItem.htmlContent || activeHtmlItem.content || "") : `<div style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">\n  <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px; font-weight: bold;">Custom HTML Block</h3>\n  <p style="margin: 0; color: #475569; font-size: 13px;">Add your custom HTML markup and styled elements here.</p>\n</div>`}
        initialCss={activeHtmlItem ? (activeHtmlItem.cssContent || "") : ""}
        onClose={() => {
          setIsCodeModalOpen(false);
          setActiveHtmlItem(null);
        }}
        onApply={(cleanHtml, extractedCss) => {
          if (activeHtmlItem) {
            handleUpdateItem({
              ...activeHtmlItem,
              htmlContent: cleanHtml,
              cssContent: extractedCss,
              content: cleanHtml,
            });
            setActiveHtmlItem(null);
          } else {
            const htmlWidget = createHtmlWidget(cleanHtml, extractedCss, "Custom HTML");
            const pages = getCurrentPages();
            const lastIdx = pages.length - 1;
            pages[lastIdx] = {
              ...pages[lastIdx],
              items: [...(pages[lastIdx].items || []), htmlWidget],
            };
            updateDoc({ ...doc, pages, items: pages.flatMap((p) => p.items) });
          }
        }}
      />

      <InsertTablePopup
        isOpen={isTablePopupOpen}
        onClose={() => setIsTablePopupOpen(false)}
        onInsert={handleInsertTable}
      />

      <InsertLayoutDialog
        isOpen={isLayoutDialogOpen}
        onClose={() => setIsLayoutDialogOpen(false)}
        onInsert={handleInsertLayout}
      />

      <PreviewModal
        isOpen={isPreviewOpen}
        doc={doc}
        mode={mode}
        pageSize={pageSize}
        orientation={orientation}
        smsText={smsText}
        onClose={() => setIsPreviewOpen(false)}
        onExportJson={handleExportJson}
        onUpdateDoc={updateDoc}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onDuplicateItem={handleDuplicateItem}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onExport={handleExportJson}
        onImportClick={() => importInputRef.current?.click()}
      />

      <VersionHistoryModal
        isOpen={isHistoryModalOpen}
        snapshots={snapshots}
        onClose={() => setIsHistoryModalOpen(false)}
        onCreateSnapshot={handleCreateSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
      />

      <CustomFieldModal
        isOpen={isCustomFieldModalOpen}
        mode={mode}
        onClose={() => setIsCustomFieldModalOpen(false)}
        onAdd={handleInsertCustomField}
      />
    </div>
  );
}
