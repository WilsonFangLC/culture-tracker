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
import { Passage, PassageCreate } from '../api'
import React from 'react'

export default function Passages() {
  const { data: passages = [], isLoading } = usePassages()
  const createPassage = useCreatePassage()
  const deletePassage = useDeletePassage()
  const [expanded, setExpanded] = useState<ExpandedState>({})

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
      header: 'PD',
      cell: (info) => (info.getValue() as number).toFixed(2),
    }),
    columnHelper.accessor('doubling_time_hours', {
      header: 'Doubling Time (h)',
      cell: (info) => {
        const value = info.getValue() as number | undefined
        return value ? value.toFixed(1) : '-'
      },
    }),
    columnHelper.accessor('cumulative_pd', {
      header: 'Cumulative PD',
      cell: (info) => {
        const value = info.getValue() as number | undefined
        return value ? value.toFixed(2) : '-'
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <button
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this passage?')) {
              await deletePassage.mutateAsync(row.original.id)
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Passages</h1>
      <PassageForm onSubmit={handleSubmit} />
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={row.getVisibleCells().length}>
                      <PassageDetails passage={row.original} />
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