import { useState } from 'react'
import { GrowthMeasurement } from '../api'

interface GrowthMeasurementFormProps {
  passageId: number
  onSubmit: (data: Omit<GrowthMeasurement, 'id'>) => Promise<void>
  isSubmitting?: boolean
}

export default function GrowthMeasurementForm({
  passageId,
  onSubmit,
  isSubmitting = false,
}: GrowthMeasurementFormProps) {
  const [formData, setFormData] = useState({
    passage_id: passageId,
    timestamp: new Date().toISOString().slice(0, 16),
    cell_density: 1,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
    setFormData({
      ...formData,
      cell_density: 1,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="timestamp"
          className="block text-sm font-medium text-gray-700"
        >
          Time
        </label>
        <input
          type="datetime-local"
          id="timestamp"
          name="timestamp"
          value={formData.timestamp}
          onChange={(e) =>
            setFormData({ ...formData, timestamp: e.target.value })
          }
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="cell_density"
          className="block text-sm font-medium text-gray-700"
        >
          Cell Density
        </label>
        <input
          type="number"
          id="cell_density"
          name="cell_density"
          min="1"
          value={formData.cell_density}
          onChange={(e) =>
            setFormData({
              ...formData,
              cell_density: parseInt(e.target.value) || 1,
            })
          }
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding...' : 'Add Measurement'}
        </button>
      </div>
    </form>
  )
} 