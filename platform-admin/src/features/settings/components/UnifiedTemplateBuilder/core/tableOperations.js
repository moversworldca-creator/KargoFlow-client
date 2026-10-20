/**
 * Pure Functional Advanced Table Engine
 * Provides 2D logical grid normalization, row/column operations,
 * cell merging, cell splitting, gap-preserving deletes, and table splitting.
 * Converted from TypeScript to React JavaScript.
 */

import { createId } from "../model/templateModel";

/**
 * Builds a dense 2D matrix of size rowCount x colCount where matrix[r][c]
 * points to the GridCellInfo covering that coordinate.
 */
export function buildLogicalGrid(rows = []) {
  const rowCount = rows.length;
  if (rowCount === 0) {
    return { matrix: [], maxCols: 0, cellCoordMap: new Map() };
  }

  let maxCols = 0;
  for (const r of rows) {
    let rowCols = 0;
    for (const c of r.cells || []) {
      rowCols += c.colSpan || 1;
    }
    if (rowCols > maxCols) maxCols = rowCols;
  }
  if (maxCols === 0) maxCols = 1;

  const matrix = Array.from({ length: rowCount }, () =>
    Array.from({ length: maxCols }, () => null)
  );

  const cellCoordMap = new Map();

  for (let r = 0; r < rowCount; r++) {
    const rowObj = rows[r];
    let colPointer = 0;

    for (const cell of rowObj.cells || []) {
      while (colPointer < maxCols && matrix[r][colPointer] !== null) {
        colPointer++;
      }
      if (colPointer >= maxCols) {
        maxCols = colPointer + (cell.colSpan || 1);
        for (let er = 0; er < rowCount; er++) {
          while (matrix[er].length < maxCols) matrix[er].push(null);
        }
      }

      const rSpan = Math.max(1, cell.rowSpan || 1);
      const cSpan = Math.max(1, cell.colSpan || 1);
      cellCoordMap.set(cell.id, { row: r, col: colPointer });

      for (let ro = 0; ro < rSpan; ro++) {
        const targetRow = r + ro;
        if (targetRow >= rowCount) break;
        for (let co = 0; co < cSpan; co++) {
          const targetCol = colPointer + co;
          if (targetCol >= maxCols) {
            maxCols = targetCol + 1;
            for (let er = 0; er < rowCount; er++) {
              while (matrix[er].length < maxCols) matrix[er].push(null);
            }
          }
          matrix[targetRow][targetCol] = {
            cell,
            row: r,
            col: colPointer,
            rowSpan: rSpan,
            colSpan: cSpan,
            isOrigin: ro === 0 && co === 0,
          };
        }
      }

      colPointer += cSpan;
    }
  }

  // Fill remaining gaps
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < maxCols; c++) {
      if (!matrix[r][c]) {
        matrix[r][c] = {
          cell: { id: `dummy-${r}-${c}`, content: "" },
          row: r,
          col: c,
          rowSpan: 1,
          colSpan: 1,
          isOrigin: true,
        };
      }
    }
  }

  return { matrix, maxCols, cellCoordMap };
}

export function normalizeSelectionRange(rows, startCellId, endCellId) {
  const { matrix, cellCoordMap } = buildLogicalGrid(rows);
  const startCoord = cellCoordMap.get(startCellId);
  const endCoord = cellCoordMap.get(endCellId);

  if (!startCoord || !endCoord || matrix.length === 0) {
    return {
      minRow: 0,
      maxRow: 0,
      minCol: 0,
      maxCol: 0,
      selectedCellIds: startCellId ? [startCellId] : [],
      isValidRect: true,
      cells: [],
    };
  }

  let minRow = Math.min(startCoord.row, endCoord.row);
  let maxRow = Math.max(startCoord.row, endCoord.row);
  let minCol = Math.min(startCoord.col, endCoord.col);
  let maxCol = Math.max(startCoord.col, endCoord.col);

  let expanded = true;
  let iterations = 0;
  while (expanded && iterations < 50) {
    expanded = false;
    iterations++;

    for (let r = minRow; r <= maxRow; r++) {
      if (r >= matrix.length) continue;
      for (let c = minCol; c <= maxCol; c++) {
        if (c >= matrix[r].length) continue;
        const info = matrix[r][c];
        if (!info) continue;

        const cellMinRow = info.row;
        const cellMaxRow = info.row + info.rowSpan - 1;
        const cellMinCol = info.col;
        const cellMaxCol = info.col + info.colSpan - 1;

        if (cellMinRow < minRow) {
          minRow = cellMinRow;
          expanded = true;
        }
        if (cellMaxRow > maxRow) {
          maxRow = cellMaxRow;
          expanded = true;
        }
        if (cellMinCol < minCol) {
          minCol = cellMinCol;
          expanded = true;
        }
        if (cellMaxCol > maxCol) {
          maxCol = cellMaxCol;
          expanded = true;
        }
      }
    }
  }

  const cellIdSet = new Set();
  const cellList = [];

  for (let r = minRow; r <= maxRow; r++) {
    if (r >= matrix.length) continue;
    for (let c = minCol; c <= maxCol; c++) {
      if (c >= matrix[r].length) continue;
      const info = matrix[r][c];
      if (info && info.cell && !cellIdSet.has(info.cell.id)) {
        cellIdSet.add(info.cell.id);
        cellList.push(info.cell);
      }
    }
  }

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    selectedCellIds: Array.from(cellIdSet),
    isValidRect: true,
    cells: cellList,
  };
}

export function insertRows(rows, targetRowIdx, direction, count = 1) {
  if (rows.length === 0) return [];
  const { maxCols } = buildLogicalGrid(rows);
  const numCols = Math.max(1, maxCols);

  const newRows = Array.from({ length: count }, () => ({
    id: createId("trow"),
    cells: Array.from({ length: numCols }, (_, cIdx) => ({
      id: createId(`cell-${cIdx + 1}`),
      content: "",
    })),
  }));

  const next = [...rows];
  const at =
    direction === "above"
      ? Math.max(0, targetRowIdx)
      : Math.min(next.length, targetRowIdx + 1);
  next.splice(at, 0, ...newRows);
  return next;
}

export function insertCols(rows, settings, targetColIdx, direction, count = 1) {
  if (rows.length === 0) return { rows: [], settings };

  const insertAt =
    direction === "left" ? Math.max(0, targetColIdx) : targetColIdx + 1;

  const nextRows = rows.map((r) => {
    const cells = [...r.cells];
    const newCells = Array.from({ length: count }, () => ({
      id: createId("cell"),
      content: "",
    }));
    cells.splice(Math.min(cells.length, insertAt), 0, ...newCells);
    return { ...r, cells };
  });

  const newCount = (rows[0]?.cells.length || 0) + count;
  const eq = Math.floor(100 / newCount);
  const rem = 100 - eq * newCount;
  const newWidths = Array.from({ length: newCount }, (_, i) =>
    i === 0 ? eq + rem : eq
  );

  return {
    rows: nextRows,
    settings: {
      ...settings,
      colCount: newCount,
      columnWidths: newWidths,
    },
  };
}

export function deleteRows(rows, rowIndices) {
  if (rows.length <= rowIndices.length) return rows;
  const toDelete = new Set(rowIndices);
  return rows.filter((_, idx) => !toDelete.has(idx));
}

export function deleteCols(rows, settings, colIndices) {
  const currentTotal = rows[0]?.cells.length || 0;
  if (currentTotal <= colIndices.length) return { rows, settings };
  const toDelete = new Set(colIndices);

  const nextRows = rows.map((r) => ({
    ...r,
    cells: r.cells.filter((_, idx) => !toDelete.has(idx)),
  }));

  const newCount = nextRows[0].cells.length;
  const eq = Math.floor(100 / newCount);
  const rem = 100 - eq * newCount;
  const newWidths = Array.from({ length: newCount }, (_, i) =>
    i === 0 ? eq + rem : eq
  );

  return {
    rows: nextRows,
    settings: {
      ...settings,
      colCount: newCount,
      columnWidths: newWidths,
    },
  };
}

export function mergeSelectedCells(rows, selectedCellIds) {
  if (!selectedCellIds || selectedCellIds.length < 2) {
    return { rows, mergedCellId: null };
  }

  const { matrix, cellCoordMap } = buildLogicalGrid(rows);
  const coords = selectedCellIds
    .map((id) => cellCoordMap.get(id))
    .filter(Boolean);

  if (coords.length < 2) return { rows, mergedCellId: null };

  const minRow = Math.min(...coords.map((c) => c.row));
  const maxRow = Math.max(...coords.map((c) => c.row));
  const minCol = Math.min(...coords.map((c) => c.col));
  const maxCol = Math.max(...coords.map((c) => c.col));

  const totalRowSpan = maxRow - minRow + 1;
  const totalColSpan = maxCol - minCol + 1;

  const topInfo = matrix[minRow]?.[minCol];
  if (!topInfo) return { rows, mergedCellId: null };

  const idSet = new Set(selectedCellIds);
  const collectedText = [];
  for (const r of rows) {
    for (const c of r.cells || []) {
      if (idSet.has(c.id) && c.content?.trim()) {
        collectedText.push(c.content.trim());
      }
    }
  }

  const mergedCell = {
    ...topInfo.cell,
    content: collectedText.join(" "),
    rowSpan: totalRowSpan,
    colSpan: totalColSpan,
  };

  const nextRows = rows.map((r, rIdx) => {
    if (rIdx < minRow || rIdx > maxRow) return r;

    const cells = [];
    let insertedPrimary = false;

    for (const c of r.cells || []) {
      if (c.id === topInfo.cell.id) {
        cells.push(mergedCell);
        insertedPrimary = true;
      } else if (idSet.has(c.id)) {
        // absorbed
      } else {
        cells.push(c);
      }
    }

    if (rIdx === minRow && !insertedPrimary) {
      cells.unshift(mergedCell);
    }

    return { ...r, cells };
  });

  return { rows: nextRows, mergedCellId: mergedCell.id };
}

export function splitMergedCell(rows, cellId, targetRows, targetCols) {
  let targetRowIdx = -1;
  let targetColIdx = -1;
  let targetCell = null;

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < (rows[r].cells || []).length; c++) {
      if (rows[r].cells[c].id === cellId) {
        targetRowIdx = r;
        targetColIdx = c;
        targetCell = rows[r].cells[c];
        break;
      }
    }
    if (targetCell) break;
  }

  if (!targetCell) return rows;

  const originalRowSpan = Math.max(1, targetCell.rowSpan || 1);
  const originalColSpan = Math.max(1, targetCell.colSpan || 1);

  const canSplitGlobal =
    (originalRowSpan > 1 || originalColSpan > 1) &&
    originalRowSpan % targetRows === 0 &&
    originalColSpan % targetCols === 0 &&
    targetRows <= originalRowSpan &&
    targetCols <= originalColSpan;

  if (canSplitGlobal) {
    const subRowSpan = Math.floor(originalRowSpan / targetRows);
    const subColSpan = Math.floor(originalColSpan / targetCols);

    const primaryCell = {
      ...targetCell,
      subGrid: undefined,
      rowSpan: subRowSpan > 1 ? subRowSpan : undefined,
      colSpan: subColSpan > 1 ? subColSpan : undefined,
    };

    return rows.map((r, rIdx) => {
      if (rIdx < targetRowIdx || rIdx >= targetRowIdx + originalRowSpan) {
        return r;
      }

      const relativeRow = rIdx - targetRowIdx;
      const shouldAddCells = relativeRow % subRowSpan === 0;
      const cells = [...r.cells];

      if (rIdx === targetRowIdx) {
        const rowExtraCells = Array.from(
          { length: targetCols - 1 },
          () => ({
            id: createId("cell"),
            content: "",
            rowSpan: subRowSpan > 1 ? subRowSpan : undefined,
            colSpan: subColSpan > 1 ? subColSpan : undefined,
            fontFamily: targetCell?.fontFamily,
            fontSize: targetCell?.fontSize,
            backgroundColor: targetCell?.backgroundColor,
            color: targetCell?.color,
          })
        );
        cells.splice(targetColIdx, 1, primaryCell, ...rowExtraCells);
      } else if (shouldAddCells) {
        const rowSubCells = Array.from(
          { length: targetCols },
          () => ({
            id: createId("cell"),
            content: "",
            rowSpan: subRowSpan > 1 ? subRowSpan : undefined,
            colSpan: subColSpan > 1 ? subColSpan : undefined,
            fontFamily: targetCell?.fontFamily,
            fontSize: targetCell?.fontSize,
            backgroundColor: targetCell?.backgroundColor,
            color: targetCell?.color,
          })
        );
        const insertAt = Math.min(cells.length, targetColIdx);
        cells.splice(insertAt, 0, ...rowSubCells);
      }

      return { ...r, cells };
    });
  }

  // Local subgrid split
  const totalSubcells = targetRows * targetCols;
  const subcells = Array.from({ length: totalSubcells }, (_, i) => ({
    id: createId("cell"),
    content: i === 0 ? targetCell.content : "",
    fontFamily: targetCell.fontFamily,
    fontSize: targetCell.fontSize,
    bold: targetCell.bold,
    italic: targetCell.italic,
    underline: targetCell.underline,
    color: targetCell.color,
    backgroundColor: targetCell.backgroundColor,
    textAlign: targetCell.textAlign,
    verticalAlign: targetCell.verticalAlign,
  }));

  const updatedCell = {
    ...targetCell,
    content: "",
    subGrid: {
      rows: targetRows,
      cols: targetCols,
      cells: subcells,
    },
  };

  return rows.map((r, rIdx) => {
    if (rIdx !== targetRowIdx) return r;
    return {
      ...r,
      cells: r.cells.map((c, cIdx) =>
        cIdx === targetColIdx ? updatedCell : c
      ),
    };
  });
}

export function clearSelectedCells(rows, selectedCellIds) {
  const targetSet = new Set(selectedCellIds);
  return rows.map((r) => ({
    ...r,
    cells: r.cells.map((c) => {
      const isTarget = targetSet.has(c.id);
      const updatedSubGrid = c.subGrid
        ? {
            ...c.subGrid,
            cells: c.subGrid.cells.map((sc) =>
              isTarget || targetSet.has(sc.id) ? { ...sc, content: "" } : sc
            ),
          }
        : undefined;

      return {
        ...c,
        content: isTarget ? "" : c.content,
        subGrid: updatedSubGrid,
      };
    }),
  }));
}

export function deleteCellsKeepGap(rows, selectedCellIds) {
  const targetSet = new Set(selectedCellIds);
  return rows.map((r) => ({
    ...r,
    cells: r.cells.map((c) => {
      const isTarget = targetSet.has(c.id);
      const updatedSubGrid = c.subGrid
        ? {
            ...c.subGrid,
            cells: c.subGrid.cells.map((sc) =>
              isTarget || targetSet.has(sc.id)
                ? {
                    ...sc,
                    content: "",
                    isSpacer: true,
                    backgroundColor: undefined,
                  }
                : sc
            ),
          }
        : undefined;

      if (isTarget) {
        return {
          ...c,
          content: "",
          isSpacer: true,
          backgroundColor: undefined,
          items: undefined,
          subGrid: updatedSubGrid,
        };
      }
      return {
        ...c,
        subGrid: updatedSubGrid,
      };
    }),
  }));
}

export function deleteRowKeepGap(rows, rowIndices) {
  const targetRows = new Set(rowIndices);
  return rows.map((r, rIdx) => {
    if (!targetRows.has(rIdx)) return r;
    return {
      ...r,
      cells: r.cells.map((c) => ({
        ...c,
        content: "",
        isSpacer: true,
        backgroundColor: undefined,
        items: undefined,
      })),
    };
  });
}

export function deleteColKeepGap(rows, colIndices) {
  const targetCols = new Set(colIndices);
  const { matrix } = buildLogicalGrid(rows);
  const targetCellIds = new Set();

  for (let r = 0; r < matrix.length; r++) {
    for (const cIdx of targetCols) {
      const info = matrix[r]?.[cIdx];
      if (info?.cell?.id) {
        targetCellIds.add(info.cell.id);
      }
    }
  }

  return deleteCellsKeepGap(rows, Array.from(targetCellIds));
}

export function deleteTableKeepGap(rows) {
  return rows.map((r) => ({
    ...r,
    cells: r.cells.map((c) => ({
      ...c,
      content: "",
      isSpacer: true,
      backgroundColor: undefined,
      items: undefined,
    })),
  }));
}

export function deleteSelectedCells(rows, selectedCellIds, behavior = "keep-gap") {
  if (behavior === "table-keep-gap") {
    return deleteTableKeepGap(rows);
  }

  if (!selectedCellIds || selectedCellIds.length === 0 || rows.length === 0) return rows;

  if (behavior === "keep-gap") {
    return deleteCellsKeepGap(rows, selectedCellIds);
  }

  if (behavior === "clear-contents") {
    return clearSelectedCells(rows, selectedCellIds);
  }

  const { cellCoordMap } = buildLogicalGrid(rows);
  const targetSet = new Set(selectedCellIds);

  if (behavior === "shift-left") {
    const affectedRowIndices = new Set();
    for (const id of selectedCellIds) {
      const coord = cellCoordMap.get(id);
      if (coord) {
        affectedRowIndices.add(coord.row);
      }
    }

    return rows.map((r, rIdx) => {
      if (!affectedRowIndices.has(rIdx)) return r;

      const remainingCells = [];
      let removedSpanCount = 0;

      for (const cell of r.cells || []) {
        if (targetSet.has(cell.id)) {
          removedSpanCount += cell.colSpan || 1;
        } else {
          remainingCells.push(cell);
        }
      }

      const fillCells = Array.from({ length: removedSpanCount }, () => ({
        id: createId("cell"),
        content: "",
      }));

      return {
        ...r,
        cells: [...remainingCells, ...fillCells],
      };
    });
  }

  // Fallback to keep-gap
  return deleteCellsKeepGap(rows, selectedCellIds);
}

/**
 * Restores a spacer cell (keep-gap cell) back to an active editable cell.
 */
export function restoreSpacerCell(rows, cellId) {
  return rows.map((r) => ({
    ...r,
    cells: (r.cells || []).map((c) => {
      if (c.id === cellId) {
        return {
          ...c,
          isSpacer: false,
        };
      }
      if (c.subGrid && c.subGrid.cells) {
        return {
          ...c,
          subGrid: {
            ...c.subGrid,
            cells: c.subGrid.cells.map((sc) =>
              sc.id === cellId ? { ...sc, isSpacer: false } : sc
            ),
          },
        };
      }
      return c;
    }),
  }));
}

/**
 * Checks whether a horizontal split at boundary splitRowIndex produces two non-empty tables
 * without crossing merged rows.
 */
export function checkHorizontalSplitValidity(rows, splitRowIndex) {
  if (splitRowIndex <= 0 || splitRowIndex >= rows.length) {
    return {
      valid: false,
      reason: "Split position must produce two non-empty tables.",
    };
  }

  const { matrix } = buildLogicalGrid(rows);
  for (let r = 0; r < splitRowIndex; r++) {
    for (let c = 0; c < (matrix[r]?.length || 0); c++) {
      const cellInfo = matrix[r][c];
      if (cellInfo && cellInfo.isOrigin) {
        const bottomRow = cellInfo.row + cellInfo.rowSpan - 1;
        if (bottomRow >= splitRowIndex) {
          return {
            valid: false,
            reason: `Row boundary crosses a merged cell spanning rows ${cellInfo.row + 1} to ${bottomRow + 1}.`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Checks whether a vertical split at boundary splitColIndex produces two non-empty tables
 * without crossing merged columns.
 */
export function checkVerticalSplitValidity(rows, splitColIndex) {
  const { matrix, maxCols } = buildLogicalGrid(rows);
  if (splitColIndex <= 0 || splitColIndex >= maxCols) {
    return {
      valid: false,
      reason: "Split position must produce two non-empty tables.",
    };
  }

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < splitColIndex; c++) {
      const cellInfo = matrix[r][c];
      if (cellInfo && cellInfo.isOrigin) {
        const rightCol = cellInfo.col + cellInfo.colSpan - 1;
        if (rightCol >= splitColIndex) {
          return {
            valid: false,
            reason: `Column boundary crosses a merged cell spanning columns ${String.fromCharCode(65 + cellInfo.col)} to ${String.fromCharCode(65 + rightCol)}.`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Splits a table horizontally at boundary splitRowIndex into two tables.
 */
export function splitTableHorizontal(rows, settings = {}, splitRowIndex) {
  const validity = checkHorizontalSplitValidity(rows, splitRowIndex);
  if (!validity.valid) {
    throw new Error(validity.reason || "Invalid horizontal split boundary");
  }

  const rows1 = rows.slice(0, splitRowIndex).map((r) => ({
    ...r,
    id: createId("trow"),
    cells: (r.cells || []).map((c) => ({ ...c })),
  }));

  const rows2 = rows.slice(splitRowIndex).map((r) => ({
    ...r,
    id: createId("trow"),
    cells: (r.cells || []).map((c) => ({
      ...c,
      id: createId("cell"),
    })),
  }));

  const settings1 = {
    ...settings,
    rowCount: rows1.length,
    rowHeights: settings.rowHeights
      ? settings.rowHeights.slice(0, splitRowIndex)
      : undefined,
  };

  const settings2 = {
    ...settings,
    rowCount: rows2.length,
    rowHeights: settings.rowHeights
      ? settings.rowHeights.slice(splitRowIndex)
      : undefined,
    headerRow: false,
  };

  return {
    table1: { rows: rows1, settings: settings1 },
    table2: { rows: rows2, settings: settings2 },
  };
}

/**
 * Splits a table vertically at boundary splitColIndex into two tables with normalized column widths.
 */
export function splitTableVertical(rows, settings = {}, splitColIndex) {
  const validity = checkVerticalSplitValidity(rows, splitColIndex);
  if (!validity.valid) {
    throw new Error(validity.reason || "Invalid vertical split boundary");
  }

  const { matrix, maxCols } = buildLogicalGrid(rows);
  const rows1 = [];
  const rows2 = [];

  for (let r = 0; r < rows.length; r++) {
    const leftCells = [];
    const rightCells = [];

    const seenIds1 = new Set();
    for (let c = 0; c < splitColIndex; c++) {
      const cellInfo = matrix[r][c];
      if (cellInfo && cellInfo.isOrigin && !seenIds1.has(cellInfo.cell.id)) {
        seenIds1.add(cellInfo.cell.id);
        leftCells.push({ ...cellInfo.cell });
      }
    }

    const seenIds2 = new Set();
    for (let c = splitColIndex; c < maxCols; c++) {
      const cellInfo = matrix[r][c];
      if (cellInfo && cellInfo.isOrigin && !seenIds2.has(cellInfo.cell.id)) {
        seenIds2.add(cellInfo.cell.id);
        rightCells.push({
          ...cellInfo.cell,
          id: createId("cell"),
        });
      }
    }

    rows1.push({
      ...rows[r],
      id: createId("trow"),
      cells: leftCells,
    });

    rows2.push({
      ...rows[r],
      id: createId("trow"),
      cells: rightCells,
    });
  }

  const origWidths =
    settings.columnWidths && settings.columnWidths.length === maxCols
      ? settings.columnWidths
      : Array.from({ length: maxCols }, () => 100 / maxCols);

  const leftWidthsRaw = origWidths.slice(0, splitColIndex);
  const rightWidthsRaw = origWidths.slice(splitColIndex);

  const sumLeft = leftWidthsRaw.reduce((a, b) => a + b, 0) || 1;
  const sumRight = rightWidthsRaw.reduce((a, b) => a + b, 0) || 1;

  const leftWidths = leftWidthsRaw.map((w) => Math.round((w / sumLeft) * 100));
  const diffLeft = 100 - leftWidths.reduce((a, b) => a + b, 0);
  if (leftWidths.length > 0) leftWidths[0] += diffLeft;

  const rightWidths = rightWidthsRaw.map((w) =>
    Math.round((w / sumRight) * 100)
  );
  const diffRight = 100 - rightWidths.reduce((a, b) => a + b, 0);
  if (rightWidths.length > 0) rightWidths[0] += diffRight;

  return {
    table1: {
      rows: rows1,
      settings: {
        ...settings,
        colCount: leftWidths.length,
        columnWidths: leftWidths,
      },
    },
    table2: {
      rows: rows2,
      settings: {
        ...settings,
        colCount: rightWidths.length,
        columnWidths: rightWidths,
      },
    },
  };
}

