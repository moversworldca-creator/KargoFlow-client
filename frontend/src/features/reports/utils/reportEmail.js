export const toCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const escaped = raw.replace(/"/g, '""');
  return /[",\n\r]/.test(raw) ? `"${escaped}"` : escaped;
};

export const rowsToCsv = (rows, columns) => {
  const head = columns.map((column) => toCsvValue(column.header)).join(',');
  const body = rows
    .map((row) => columns.map((column) => toCsvValue(column.value(row))).join(','))
    .join('\n');
  return `${head}\n${body}\n`;
};
