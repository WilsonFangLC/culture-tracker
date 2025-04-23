import { useState } from 'react'
import { PassageCreate, usePassages } from '../api'

interface PassageFormProps {
  onSubmit: (data: PassageCreate) => Promise<void>
}

export default function PassageForm({ onSubmit }: PassageFormProps) {
  const { data: passages = [] } = usePassages()
  const [formData, setFormData] = useState<PassageCreate>({
    start_time: new Date().toISOString().slice(0, 16),
    harvest_time: new Date().toISOString().slice(0, 16),
    seed_count: 1,
    harvest_count: 1,
  })
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    // Validate start time
    if (!formData.start_time) {
      errors.start_time = 'Start time is required'
    }

    // Validate harvest time
    if (!formData.harvest_time) {
      errors.harvest_time = 'Harvest time is required'
    } else if (formData.start_time && formData.harvest_time) {
      const start = new Date(formData.start_time)
      const harvest = new Date(formData.harvest_time)
      if (harvest <= start) {
        errors.harvest_time = 'Harvest time must be later than start time'
      }
    }

    // Validate parent passage timing
    if (formData.parent_id) {
      const parentPassage = passages.find(p => p.id === formData.parent_id)
      if (parentPassage) {
        const parentHarvestTime = new Date(parentPassage.harvest_time)
        const childStartTime = new Date(formData.start_time)
        if (childStartTime < parentHarvestTime) {
          errors.start_time = `Start time must be after parent passage's harvest time (${new Date(parentPassage.harvest_time).toLocaleString()})`
        }
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleParentChange = (parentId: string) => {
    const newParentId = parentId ? parseInt(parentId) : undefined
    setFormData({
      ...formData,
      parent_id: newParentId,
    })
    // Clear validation errors when parent changes
    setValidationErrors(prev => ({ ...prev, start_time: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
      setFormData({
        start_time: new Date().toISOString().slice(0, 16),
        harvest_time: new Date().toISOString().slice(0, 16),
        seed_count: 1,
        harvest_count: 1,
      })
      setValidationErrors({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Validation Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {error.split('\n').map((line, i) => (
                  <p key={i} className="mt-1">{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div>
        <label
          htmlFor="parent_id"
          className="block text-sm font-medium text-gray-700"
        >
          Parent Passage
        </label>
        <select
          id="parent_id"
          name="parent_id"
          value={formData.parent_id || ''}
          onChange={(e) => handleParentChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">No Parent</option>
          {passages.map((passage) => (
            <option key={passage.id} value={passage.id}>
              {new Date(passage.start_time).toLocaleString()} (ID: {passage.id})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="start_time"
          className="block text-sm font-medium text-gray-700"
        >
          Start Time
        </label>
        <input
          type="datetime-local"
          id="start_time"
          name="start_time"
          value={formData.start_time}
          onChange={(e) => {
            setFormData({ ...formData, start_time: e.target.value })
            setValidationErrors(prev => ({ ...prev, start_time: '' }))
          }}
          className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
            validationErrors.start_time ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {validationErrors.start_time && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.start_time}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="harvest_time"
          className="block text-sm font-medium text-gray-700"
        >
          Harvest Time
        </label>
        <input
          type="datetime-local"
          id="harvest_time"
          name="harvest_time"
          value={formData.harvest_time}
          onChange={(e) => {
            setFormData({ ...formData, harvest_time: e.target.value })
            setValidationErrors(prev => ({ ...prev, harvest_time: '' }))
          }}
          className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
            validationErrors.harvest_time ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {validationErrors.harvest_time && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.harvest_time}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="seed_count"
          className="block text-sm font-medium text-gray-700"
        >
          Seed Count
        </label>
        <input
          type="number"
          id="seed_count"
          name="seed_count"
          min="1"
          value={formData.seed_count}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!Number.isNaN(v)) {
              setFormData({ ...formData, seed_count: v })
            }
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="harvest_count"
          className="block text-sm font-medium text-gray-700"
        >
          Harvest Count
        </label>
        <input
          type="number"
          id="harvest_count"
          name="harvest_count"
          min="1"
          value={formData.harvest_count}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!Number.isNaN(v)) {
              setFormData({ ...formData, harvest_count: v })
            }
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Passage
        </button>
      </div>
    </form>
  )
} 