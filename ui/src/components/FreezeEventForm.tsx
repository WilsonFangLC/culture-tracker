import { useState } from 'react'
import { FreezeEvent } from '../api'

interface FreezeEventFormProps {
  passageId: number
  onSubmit: (data: Omit<FreezeEvent, 'id'>) => Promise<void>
  isSubmitting?: boolean
}

export default function FreezeEventForm({
  passageId,
  onSubmit,
  isSubmitting = false,
}: FreezeEventFormProps) {
  const [formData, setFormData] = useState({
    passage_id: passageId,
    timestamp: new Date().toISOString().slice(0, 16),
    vial_count: 1,
    label: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
    setFormData({
      ...formData,
      vial_count: 1,
      label: '',
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
          htmlFor="vial_count"
          className="block text-sm font-medium text-gray-700"
        >
          Number of Vials
        </label>
        <input
          type="number"
          id="vial_count"
          name="vial_count"
          min="1"
          value={formData.vial_count}
          onChange={(e) =>
            setFormData({
              ...formData,
              vial_count: parseInt(e.target.value) || 1,
            })
          }
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="label"
          className="block text-sm font-medium text-gray-700"
        >
          Label (Optional)
        </label>
        <input
          type="text"
          id="label"
          name="label"
          value={formData.label}
          onChange={(e) =>
            setFormData({ ...formData, label: e.target.value })
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
          {isSubmitting ? 'Adding...' : 'Add Freeze Event'}
        </button>
      </div>
    </form>
  )
} 