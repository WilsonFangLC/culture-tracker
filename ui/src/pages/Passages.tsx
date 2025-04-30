// Commenting out entire file as it heavily relies on missing API exports (Passage, usePassages, etc.)
// Build will fail until these are implemented or the component is removed.

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
            Passages feature is temporarily disabled due to build errors.
        </div>
    );
} 