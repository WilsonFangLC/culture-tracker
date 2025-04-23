import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ExpandedState,
  getExpandedRowModel,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  usePassages,
  useCreatePassage,
  useDeletePassage,
} from '../api'
import PassageForm from '../components/PassageForm'
import PassageDetails from '../components/PassageDetails'
import LineageTree from '../components/LineageTree'
import { Passage, PassageCreate } from '../api'
import React from 'react'

export default function Passages() {
  const { data: passages = [], isLoading } = usePassages()
  const createPassage = useCreatePassage()
  const deletePassage = useDeletePassage()
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null)

  const columnHelper = createColumnHelper<Passage>()
  const columns = [
    columnHelper.display({
      id: 'expander',
      cell: ({ row }) => (
        <button
          {...{
            onClick: row.getToggleExpandedHandler(),
            style: { cursor: 'pointer' },
          }}
        >
          {row.getIsExpanded() ? '👇' : '👉'}
        </button>
      ),
    }),
    columnHelper.accessor('start_time', {
      header: 'Start Time',
      cell: (info) => new Date(info.getValue() as string).toLocaleString(),
    }),
    columnHelper.accessor('harvest_time', {
      header: 'Harvest Time',
      cell: (info) => new Date(info.getValue() as string).toLocaleString(),
    }),
    columnHelper.accessor('seed_count', {
      header: 'Seed Count',
    }),
    columnHelper.accessor('harvest_count', {
      header: 'Harvest Count',
    }),
    columnHelper.accessor('generation', {
      header: 'Cumulative PD',
      cell: (info) => {
        const value = info.getValue() as number;
        const row = info.row.original;
        const currentPD = Math.log2(row.harvest_count / row.seed_count);
        return (
          <div className="flex flex-col">
            <span className="font-medium">{value.toFixed(2)}</span>
            <span className="text-xs text-gray-500">
              (This passage: {currentPD.toFixed(2)})
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor('doubling_time_hours', {
      header: 'Doubling Time (h)',
      cell: (info) => {
        const value = info.getValue() as number | undefined;
        return value ? value.toFixed(1) : '-';
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <button
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this passage?')) {
              await deletePassage.mutateAsync(row.original.id);
            }
          }}
          className="text-red-600 hover:text-red-900"
        >
          Delete
        </button>
      ),
    }),
  ]

  const table = useReactTable({
    columns,
    data: passages,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  const handleSubmit = async (data: PassageCreate) => {
    await createPassage.mutateAsync(data)
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-4">
      {/* Global Lineage Tree Section */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Lineage Tree</h2>
        <div className="h-[400px]">
          <LineageTree 
            passages={passages} 
            onSelectPassage={setSelectedPassage}
          />
        </div>
      </div>

      {/* Passage Form */}
      <div className="mb-6">
        <PassageForm onSubmit={handleSubmit} isSubmitting={createPassage.isPending} />
      </div>

      {/* Passages Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <React.Fragment key={row.id}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedPassage(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={row.getVisibleCells().length}>
                      <div className="px-6 py-4">
                        <PassageDetails passage={row.original} />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 