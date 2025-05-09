/**
 * DEPRECATED: This component is no longer maintained.
 * This component was part of the Passages feature which has been disabled.
 * Keeping for reference purposes only.
 */
// import { useCreateGrowthMeasurement, usePassage, usePassages } from '../api' // Commented out: Missing API exports
// import { Passage, GrowthMeasurement } from '../api' // Commented out: Missing API exports
// import GrowthMeasurementForm from './GrowthMeasurementForm'
import React, { useState } from 'react'

interface PassageDetailsProps {
  // passage: Passage // Commented out
  passage: any // Using any as temporary type
}

// export default function PassageDetails({ passage }: PassageDetailsProps) { // Commented out
export default function PassageDetails({ passage }: PassageDetailsProps) {
  const [showAddMeasurement, setShowAddMeasurement] = useState(false)
  // const createGrowthMeasurement = useCreateGrowthMeasurement() // Commented out

  const handleAddMeasurement = async (data: any /* Omit<GrowthMeasurement, 'id'> */) => { // Using any
    // await createGrowthMeasurement.mutateAsync(data) // Commented out
    console.log("Measurement data (not sent):", data) // Placeholder action
    setShowAddMeasurement(false)
  }

  // Placeholder for data that might have come from usePassage/usePassages
  const childPassages: any[] = passage.children || []; // Assuming children might be part of the passage object
  const measurements: any[] = passage.measurements || []; // Assuming measurements might be part of the passage object

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Passage {passage.id} Details</h3>
      {/* Display passage details using the 'passage' prop (type any) */}
      <div className="mb-4 space-y-2">
        <p><strong>Name:</strong> {passage.name || 'N/A'}</p>
        <p><strong>Created By:</strong> {passage.created_by || 'N/A'}</p>
        <p><strong>Parent ID:</strong> {passage.parent_id || 'Root'}</p>
        {/* Add other relevant passage fields */}
      </div>

      <h4 className="text-md font-medium text-gray-700 mt-4 mb-2">Measurements</h4>
      {measurements.length > 0 ? (
        <ul className="list-disc pl-5 space-y-1">
          {measurements.map((measurement: any, index: number) => (
            <li key={index} className="text-sm">
              {new Date(measurement.timestamp).toLocaleString()}: Density {measurement.cell_density}, Viability {measurement.viability}%
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No measurements recorded.</p>
      )}

      <button
        onClick={() => setShowAddMeasurement(true)}
        className="mt-4 mb-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Add Measurement
      </button>

      {showAddMeasurement && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h5 className="text-md font-medium text-gray-800 mb-2">New Measurement</h5>
          <GrowthMeasurementForm
            passageId={passage.id}
            onSubmit={handleAddMeasurement}
            // isSubmitting={createGrowthMeasurement.isLoading} // Commented out
          />
          <button
            onClick={() => setShowAddMeasurement(false)}
            className="mt-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      )}

      <h4 className="text-md font-medium text-gray-700 mt-6 mb-2">Child Passages</h4>
      {childPassages.length > 0 ? (
         <ul className="list-disc pl-5 space-y-1">
          {childPassages.map((child: any) => (
            <li key={child.id} className="text-sm">
              Passage {child.id} - {child.name || 'No Name'}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No child passages.</p>
      )}

    </div>
  )
} 