/**
 * DEPRECATED: This feature is no longer maintained.
 * The Passages functionality was planned but development was discontinued.
 * Keeping for reference purposes only.
 */

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
// import {
//   usePassages, // Missing
//   useCreatePassage, // Missing
//   useDeletePassage, // Missing
// } from '../api'
import PassageForm from '../components/PassageForm'
import PassageDetails from '../components/PassageDetails'
import LineageTree from '../components/LineageTree'
// import { Passage, PassageCreate } from '../api' // Missing
import React from 'react'

export default function Passages() {
    return (
        <div className="p-4">
            Passages feature is deprecated and no longer maintained.
        </div>
    );
} 