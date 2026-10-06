import React, { useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LeadImportTable({ data, validationErrors }) {
  const columns = useMemo(() => [
    {
      header: 'Status',
      accessorKey: 'isValid',
      cell: info => {
        const rowId = info.row.id;
        const errors = validationErrors[rowId];
        return errors ? (
          <div className="flex items-center text-red-600" title={errors.join(', ')}>
            <AlertCircle className="w-4 h-4 mr-1" />
            <span className="text-xs">Invalid</span>
          </div>
        ) : (
          <div className="flex items-center text-green-600">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            <span className="text-xs">Valid</span>
          </div>
        );
      }
    },
    { header: 'First Name', accessorKey: 'first_name' },
    { header: 'Last Name', accessorKey: 'last_name' },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Source', accessorKey: 'lead_source' },
    { header: 'Origin', accessorKey: 'origin_address' },
    { header: 'Destination', accessorKey: 'destination_address' },
    { header: 'Move Size', accessorKey: 'move_size' },
    { header: 'Move Type', accessorKey: 'move_type' },
    { header: 'Move Date', accessorKey: 'move_date' },
    { header: 'Notes', accessorKey: 'notes', cell: info => <div className="truncate max-w-xs">{info.getValue()}</div> }
  ], [validationErrors]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();
  
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  return (
    <div className="border rounded-md overflow-hidden bg-white shadow-sm flex flex-col h-96">
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto"
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {virtualizer.getVirtualItems().map(virtualRow => {
                const row = rows[virtualRow.index];
                return (
                  <tr 
                    key={row.id} 
                    className="hover:bg-gray-50 absolute w-full"
                    style={{
                      top: 0,
                      left: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`
                    }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-2 whitespace-nowrap text-gray-900 bg-white">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
