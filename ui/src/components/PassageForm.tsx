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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
    setFormData({
      start_time: new Date().toISOString().slice(0, 16),
      harvest_time: new Date().toISOString().slice(0, 16),
      seed_count: 1,
      harvest_count: 1,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          onChange={(e) =>
            setFormData({
              ...formData,
              parent_id: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
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
          onChange={(e) =>
            setFormData({ ...formData, start_time: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
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
          onChange={(e) =>
            setFormData({ ...formData, harvest_time: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
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