'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable/DataTable';
import { motion } from 'framer-motion';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  HeartIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { type WellWisher } from '@/hooks/useAdminData';

interface AdminDataTableProps {
  data: WellWisher[];
  onEdit: (wellWisher: WellWisher) => void;
  onDelete: (wellWisher: WellWisher) => void;
  onView?: (wellWisher: WellWisher) => void;
  loading?: boolean;
}

export function AdminDataTable({ 
  data, 
  onEdit, 
  onDelete, 
  onView,
  loading = false 
}: AdminDataTableProps) {
  const columns: ColumnDef<WellWisher>[] = [
    {
      accessorKey: 'name',
      header: 'Well-Wisher',
      cell: ({ row }) => {
        const wellWisher = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <HeartIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{wellWisher.name}</div>
              <div className="text-sm text-gray-500">{wellWisher.email}</div>
              {wellWisher.phone && (
                <div className="text-sm text-gray-400">{wellWisher.phone}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'upcomingTasks',
      header: 'Upcoming',
      cell: ({ row }) => {
        const count = row.getValue('upcomingTasks') as number;
        return (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-blue-600">
              <ClockIcon className="h-4 w-4" />
              <span className="font-semibold">{count}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'ongoingTasks',
      header: 'Ongoing',
      cell: ({ row }) => {
        const count = row.getValue('ongoingTasks') as number;
        return (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-yellow-600">
              <ArrowPathIcon className="h-4 w-4" />
              <span className="font-semibold">{count}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'completedTasks',
      header: 'Completed',
      cell: ({ row }) => {
        const count = row.getValue('completedTasks') as number;
        return (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-green-600">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="font-semibold">{count}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'updatingTasks',
      header: 'Updating',
      cell: ({ row }) => {
        const count = row.getValue('updatingTasks') as number;
        return (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-purple-600">
              <PencilSquareIcon className="h-4 w-4" />
              <span className="font-semibold">{count}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Registered',
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'));
        return (
          <div className="text-sm text-gray-600">
            {date.toLocaleDateString()}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const wellWisher = row.original;
        return (
          <div className="flex items-center space-x-2">
            {onView && (
              <motion.button
                onClick={() => onView(wellWisher)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <EyeIcon className="h-4 w-4" />
              </motion.button>
            )}
            <motion.button
              onClick={() => onEdit(wellWisher)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <PencilIcon className="h-4 w-4" />
            </motion.button>
            <motion.button
              onClick={() => onDelete(wellWisher)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <TrashIcon className="h-4 w-4" />
            </motion.button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search well-wishers..."
      showPagination={true}
      showSearch={true}
      pageSize={10}
      className="bg-white rounded-lg shadow-sm"
    />
  );
}
