'use client';

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
        />
        <div className="text-sm font-semibold text-gray-900">
          Showing {table.getFilteredRowModel().rows.length} of {data.length} results
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-900"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'flex cursor-pointer select-none items-center gap-2 hover:text-green-600'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span>
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUpIcon className="h-4 w-4" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDownIcon className="h-4 w-4" />
                              ) : (
                                <div className="h-4 w-4 opacity-30">
                                  <ChevronUpIcon className="h-4 w-4" />
                                </div>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-green-500 focus:outline-none"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

