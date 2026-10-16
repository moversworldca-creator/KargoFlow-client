import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Maximize2,
  Minimize2,
  Grid,
  Columns,
  Rows,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Paintbrush,
  Sparkles,
} from "lucide-react";
import InlineEdit from "./InlineEdit";
import SplitCellDialog from "../modals/SplitCellDialog";
import DeleteCellsDialog from "../modals/DeleteCellsDialog";
import {
  buildLogicalGrid,
  normalizeSelectionRange,
  insertRows,
  insertCols,
  deleteRows,
  deleteCols,
  mergeSelectedCells,
  splitMergedCell,
  clearSelectedCells,
  deleteSelectedCells,
  deleteRowKeepGap,
  deleteColKeepGap,
} from "../core/tableOperations";

export default function InteractiveTableBlock({
  item,
  preview = false,
  isSelected = false,
  onSelect = () => {},
  onItem = () => {},
  selection = null,
  resolveVariables = false,
  onSelectPart = () => {},
}) {
  const rows = item.tableRows || [];
  const settings = item.tableSettings || {};
  const isLayout = Boolean(settings.isLayout);

  // Cell Selection State
  const [selectedCellId, setSelectedCellId] = useState(null);
  const [multiCellIds, setMultiCellIds] = useState([]);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const dragStartCellIdRef = useRef(null);

  // Modals
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Column / Row indices of primary selected cell
  const { cellCoordMap, matrix } = buildLogicalGrid(rows);
  const primaryCoord = selectedCellId ? cellCoordMap.get(selectedCellId) : null;
  const selRowIdx = primaryCoord ? primaryCoord.row : -1;
  const selColIdx = primaryCoord ? primaryCoord.col : -1;

  const selCellObj = primaryCoord
    ? matrix[primaryCoord.row]?.[primaryCoord.col]?.cell
    : null;

  // Clear sub-selection when item unselects
  useEffect(() => {
    if (!isSelected) {
      setSelectedCellId(null);
      setMultiCellIds([]);
    }
  }, [isSelected]);

  // Handle cell click / selection
  const handleCellClick = (cellId, e) => {
    e.stopPropagation();
    onSelect();
    setSelectedCellId(cellId);
    setMultiCellIds([cellId]);
    onSelectPart(`cell:${cellId}`);
  };

  // Drag selection start
  const handleCellPointerDown = (cellId, e) => {
    if (preview) return;
    if (e.button !== 0) return; // Primary click only
    setIsSelectingRange(true);
    dragStartCellIdRef.current = cellId;
    setSelectedCellId(cellId);
    setMultiCellIds([cellId]);
    onSelectPart(`cell:${cellId}`);
  };

  // Drag selection enter
  const handleCellPointerEnter = (cellId) => {
    if (!isSelectingRange || !dragStartCellIdRef.current || preview) return;
    const range = normalizeSelectionRange(rows, dragStartCellIdRef.current, cellId);
    setMultiCellIds(range.selectedCellIds);
  };

  // Drag selection finish
  useEffect(() => {
    const handlePointerUp = () => {
      setIsSelectingRange(false);
      dragStartCellIdRef.current = null;
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  // Update attributes on currently selected cells
  const updateSelectedCells = (patch) => {
    const targetSet = new Set(multiCellIds.length > 0 ? multiCellIds : [selectedCellId]);
    const nextRows = rows.map((r) => ({
      ...r,
      cells: (r.cells || []).map((c) => {
        if (targetSet.has(c.id)) {
          return { ...c, ...patch };
        }
        return c;
      }),
    }));
    onItem({ ...item, tableRows: nextRows });
  };

  // Merge selected cells
  const handleMerge = () => {
    if (multiCellIds.length < 2) return;
    const res = mergeSelectedCells(rows, multiCellIds);
    if (res.mergedCellId) {
      onItem({ ...item, tableRows: res.rows });
      setSelectedCellId(res.mergedCellId);
      setMultiCellIds([res.mergedCellId]);
    }
  };

  // Split selected cell
  const handleSplit = (targetRows, targetCols) => {
    if (!selectedCellId) return;
    const next = splitMergedCell(rows, selectedCellId, targetRows, targetCols);
    onItem({ ...item, tableRows: next });
  };

  // Move to next cell on Tab
  const handleMoveToNextCell = (currentCellId) => {
    const allCells = rows.flatMap((r) => r.cells || []);
    const idx = allCells.findIndex((c) => c.id === currentCellId);
    if (idx >= 0 && idx + 1 < allCells.length) {
      const nextCell = allCells[idx + 1];
      setSelectedCellId(nextCell.id);
      setMultiCellIds([nextCell.id]);
      onSelectPart(`cell:${nextCell.id}`);
    }
  };

  // Column Resize Drag Handler
  const handleColResizeStart = (colIdx, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const currentCols = rows[0]?.cells?.length || 1;
    const initialWidths =
      settings.columnWidths && settings.columnWidths.length === currentCols
        ? [...settings.columnWidths]
        : Array.from({ length: currentCols }, () => Math.round(100 / currentCols));

    const container = e.currentTarget.closest(".table-container-wrap");
    const containerWidth = container ? container.clientWidth : 700;

    const onPointerMove = (moveEvt) => {
      const deltaPx = moveEvt.clientX - startX;
      const deltaPct = Math.round((deltaPx / containerWidth) * 100);
      if (deltaPct === 0) return;

      const nextWidths = [...initialWidths];
      const newW = Math.max(5, Math.min(80, initialWidths[colIdx] + deltaPct));
      const diff = newW - initialWidths[colIdx];
      nextWidths[colIdx] = newW;

      if (colIdx + 1 < nextWidths.length) {
        nextWidths[colIdx + 1] = Math.max(5, nextWidths[colIdx + 1] - diff);
      }
      const sum = nextWidths.reduce((a, b) => a + b, 0);
      if (sum !== 100 && nextWidths.length > 0) {
        nextWidths[0] += 100 - sum;
      }
      onItem({
        ...item,
        tableSettings: { ...settings, columnWidths: nextWidths },
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Row Height Resize Drag Handler
  const handleRowResizeStart = (rIdx, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const initialH = rows[rIdx]?.height || 36;

    const onPointerMove = (moveEvt) => {
      const deltaPx = moveEvt.clientY - startY;
      const nextH = Math.max(24, Math.min(240, initialH + deltaPx));
      const nextRows = rows.map((r, idx) =>
        idx === rIdx ? { ...r, height: nextH } : r
      );
      onItem({ ...item, tableRows: nextRows });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const hasSelectedCell = Boolean(selectedCellId);
  const columnWidths =
    settings.columnWidths && settings.columnWidths.length === (rows[0]?.cells?.length || 1)
      ? settings.columnWidths
      : Array.from(
          { length: rows[0]?.cells?.length || 1 },
          () => 100 / (rows[0]?.cells?.length || 1)
        );

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`table-container-wrap relative rounded-lg transition ${
        isLayout ? "my-2" : "border border-slate-200 overflow-hidden"
      }`}
    >
      {/* Title / Label Header if standard table */}
      {!isLayout && Boolean(item.label && item.label.trim()) && (
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
          <InlineEdit
            value={item.label}
            part="label"
            selection={selection}
            preview={preview}
            resolveVariables={resolveVariables}
            onSelect={onSelect}
            onCommit={(val) => onItem({ ...item, label: val })}
            className="font-bold text-xs"
          />
        </div>
      )}

      {/* Floating Contextual Table Toolbar (Rows, Cols, Merge, Split, Colors) */}
      {!preview && isSelected && hasSelectedCell && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-wrap items-center gap-1 p-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg shadow-lg text-xs select-none mb-2 animate-in fade-in duration-150"
        >
          {/* Row Inserts */}
          <button
            type="button"
            onClick={() => {
              const next = insertRows(rows, selRowIdx >= 0 ? selRowIdx : 0, "above", 1);
              onItem({ ...item, tableRows: next });
            }}
            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
            title="Insert row above"
          >
            + Row ↑
          </button>
          <button
            type="button"
            onClick={() => {
              const next = insertRows(
                rows,
                selRowIdx >= 0 ? selRowIdx : rows.length - 1,
                "below",
                1
              );
              onItem({ ...item, tableRows: next });
            }}
            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
            title="Insert row below"
          >
            + Row ↓
          </button>

          <span className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Col Inserts */}
          <button
            type="button"
            onClick={() => {
              const res = insertCols(rows, settings, selColIdx >= 0 ? selColIdx : 0, "left", 1);
              onItem({ ...item, tableRows: res.rows, tableSettings: res.settings });
            }}
            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
            title="Insert column left"
          >
            + Col ←
          </button>
          <button
            type="button"
            onClick={() => {
              const res = insertCols(
                rows,
                settings,
                selColIdx >= 0 ? selColIdx : (rows[0]?.cells?.length || 1) - 1,
                "right",
                1
              );
              onItem({ ...item, tableRows: res.rows, tableSettings: res.settings });
            }}
            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
            title="Insert column right"
          >
            + Col →
          </button>

          <span className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Merge & Split */}
          <button
            type="button"
            disabled={multiCellIds.length < 2}
            onClick={handleMerge}
            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 disabled:opacity-40 disabled:hover:bg-blue-50 rounded text-[11px] font-semibold transition"
            title={
              multiCellIds.length >= 2
                ? `Merge ${multiCellIds.length} selected cells`
                : "Select multiple cells to merge"
            }
          >
            ⊞ Merge {multiCellIds.length > 1 ? `(${multiCellIds.length})` : ""}
          </button>

          <button
            type="button"
            onClick={() => setSplitDialogOpen(true)}
            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
            title="Split cell into rows and columns"
          >
            ⊟ Split
          </button>

          <span className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Cell Formatting: Bold, Italic, Alignments */}
          <button
            type="button"
            onClick={() => updateSelectedCells({ bold: !selCellObj?.bold })}
            className={`p-1.5 rounded border transition ${
              selCellObj?.bold
                ? "bg-blue-50 border-blue-400 text-blue-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => updateSelectedCells({ italic: !selCellObj?.italic })}
            className={`p-1.5 rounded border transition ${
              selCellObj?.italic
                ? "bg-blue-50 border-blue-400 text-blue-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Italic"
          >
            <Italic size={14} />
          </button>

          <button
            type="button"
            onClick={() => updateSelectedCells({ textAlign: "left" })}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded transition"
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => updateSelectedCells({ textAlign: "center" })}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded transition"
            title="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            onClick={() => updateSelectedCells({ textAlign: "right" })}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded transition"
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>

          <span className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Background color picker */}
          <label className="flex items-center gap-1 cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 px-1.5 py-1 rounded transition" title="Cell Background Color">
            <span
              className="w-3.5 h-3.5 rounded border border-slate-400 inline-block"
              style={{ backgroundColor: selCellObj?.backgroundColor || "#ffffff" }}
            />
            <input
              type="color"
              value={selCellObj?.backgroundColor || "#ffffff"}
              onChange={(e) => updateSelectedCells({ backgroundColor: e.target.value })}
              className="sr-only"
            />
          </label>

          {/* Text color picker */}
          <label className="flex items-center gap-1 cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 px-1.5 py-1 rounded transition" title="Cell Text Color">
            <span className="text-[11px] font-bold text-amber-500">A</span>
            <input
              type="color"
              value={selCellObj?.color || "#000000"}
              onChange={(e) => updateSelectedCells({ color: e.target.value })}
              className="sr-only"
            />
          </label>

          <span className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Deletion & Clear */}
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-semibold transition"
            title="Delete selected cell(s)"
          >
            Delete Cells
          </button>

          <button
            type="button"
            onClick={() => {
              const next = clearSelectedCells(rows, multiCellIds.length > 0 ? multiCellIds : [selectedCellId]);
              onItem({ ...item, tableRows: next });
            }}
            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[11px] font-semibold transition"
            title="Clear text inside selected cells"
          >
            Clear Text
          </button>
        </div>
      )}

      {/* Main Table Grid View with Resizer Bars */}
      <div className="overflow-x-auto w-full">
        {/* Column Header Selection & Resizer Bar */}
        {!preview && isSelected && (
          <div className="flex w-full pl-6 bg-slate-100 border-b border-slate-200">
            {columnWidths.map((w, cIdx) => (
              <div
                key={cIdx}
                style={{ width: `${w}%` }}
                className={`relative px-2 py-1 text-[10px] font-bold text-center border-r border-slate-300 transition ${
                  selColIdx === cIdx ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{String.fromCharCode(65 + cIdx)} ({Math.round(w)}%)</span>
                {/* Column width drag handle */}
                <div
                  onPointerDown={(e) => handleColResizeStart(cIdx, e)}
                  className="absolute top-0 right-0 bottom-0 w-2 hover:w-3 cursor-col-resize hover:bg-blue-500/50 z-20 transition-all"
                  title="Drag left/right to resize column width"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex w-full">
          {/* Row Header Handles Column */}
          {!preview && isSelected && (
            <div className="flex flex-col w-6 shrink-0 bg-slate-100 border-r border-slate-200 select-none">
              {rows.map((row, rIdx) => (
                <div
                  key={row.id}
                  style={{ height: row.height || 36 }}
                  className={`relative flex items-center justify-center text-[10px] font-bold border-b border-slate-300 transition ${
                    selRowIdx === rIdx ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{rIdx + 1}</span>
                  {/* Row height drag handle */}
                  <div
                    onPointerDown={(e) => handleRowResizeStart(rIdx, e)}
                    className="absolute left-0 right-0 bottom-0 h-2 hover:h-3 cursor-row-resize hover:bg-blue-500/50 z-20 transition-all"
                    title="Drag up/down to resize row height"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Table Elements */}
          <table className="w-full border-collapse text-xs table-fixed">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ height: row.height || 36 }}>
                  {(row.cells || []).map((cell) => {
                    const isCellSelected =
                      multiCellIds.includes(cell.id) || selectedCellId === cell.id;
                    const isSpacer = Boolean(cell.isSpacer);

                    return (
                      <td
                        key={cell.id}
                        rowSpan={cell.rowSpan || 1}
                        colSpan={cell.colSpan || 1}
                        onPointerDown={(e) => handleCellPointerDown(cell.id, e)}
                        onPointerEnter={() => handleCellPointerEnter(cell.id)}
                        onClick={(e) => handleCellClick(cell.id, e)}
                        style={{
                          backgroundColor: isSpacer
                            ? "transparent"
                            : cell.backgroundColor || (isLayout ? "transparent" : "#ffffff"),
                          color: cell.color || "#0f172a",
                          fontWeight: cell.bold ? 700 : undefined,
                          fontStyle: cell.italic ? "italic" : undefined,
                          textAlign: cell.textAlign || "left",
                          verticalAlign: cell.verticalAlign || "middle",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                        className={`transition relative p-2 min-h-[36px] cursor-text break-words overflow-hidden [overflow-wrap:anywhere] [word-break:break-word] ${
                          isLayout
                            ? "border border-dashed border-slate-200 hover:border-blue-300"
                            : isSpacer
                            ? "border-transparent"
                            : "border border-slate-200"
                        } ${
                          isCellSelected
                            ? "ring-2 ring-blue-500 ring-inset bg-blue-50/30"
                            : ""
                        }`}
                      >
                        {isSpacer ? (
                          <div className="h-4" />
                        ) : cell.items && cell.items.length > 0 ? (
                          <div className="space-y-1">
                            {cell.items.map((it) => (
                              <div key={it.id} className="text-xs">
                                {it.type === "heading" && <h4 className="font-bold">{it.text}</h4>}
                                {it.type === "text" && <p>{it.text}</p>}
                                {it.type === "image" && (
                                  <div className="h-14 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-[10px]">
                                    Image
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <InlineEdit
                            value={cell.content || ""}
                            part={`cell_${cell.id}`}
                            selection={selectedCellId === cell.id ? `cell_${cell.id}` : selection}
                            preview={preview}
                            resolveVariables={resolveVariables}
                            allowEmpty={true}
                            className="w-full min-w-0 max-w-full text-inherit block break-words [overflow-wrap:anywhere] [word-break:break-word]"
                            onSelect={() => {
                              onSelect();
                              handleCellClick(cell.id, { stopPropagation: () => {} });
                            }}
                            onCommit={(val) => {
                              const nextRows = rows.map((r) => ({
                                ...r,
                                cells: (r.cells || []).map((c) =>
                                  c.id === cell.id ? { ...c, content: val } : c
                                ),
                              }));
                              onItem({ ...item, tableRows: nextRows });
                            }}
                            onNext={() => handleMoveToNextCell(cell.id)}
                          />
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

      {/* Split Cell Modal */}
      <SplitCellDialog
        isOpen={splitDialogOpen}
        cell={selCellObj}
        onClose={() => setSplitDialogOpen(false)}
        onSplit={handleSplit}
      />

      {/* Delete Cells Modal */}
      <DeleteCellsDialog
        isOpen={deleteDialogOpen}
        selectedCount={multiCellIds.length || 1}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={(behavior) => {
          const targetIds = multiCellIds.length > 0 ? multiCellIds : [selectedCellId];
          const next = deleteSelectedCells(rows, targetIds, behavior);
          onItem({ ...item, tableRows: next });
          setSelectedCellId(null);
          setMultiCellIds([]);
        }}
      />
    </div>
  );
}
