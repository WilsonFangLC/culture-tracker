import { useState } from 'react'

interface CreateStateFormProps {
  onSubmit: (data: {
    timestamp: string;
    parameters: {
      status: string;
      temperature_c: number;
      volume_ml: number;
      location: string;
    };
  }) => void;
  onCancel: () => void;
}

export default function CreateStateForm({ onSubmit, onCancel }: CreateStateFormProps) {
  const [formData, setFormData] = useState({
    temperature_c: 37,
    volume_ml: 20,
    location: 'incubator',
    status: 'culturing',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      timestamp: new Date().toISOString(),
      parameters: formData,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg">
      <h3 className="text-lg font-semibold">Create New State</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          className="mt-1 w-full p-2 border rounded"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="culturing">Culturing</option>
          <option value="frozen">Frozen</option>
          <option value="thawed">Thawed</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Temperature (°C)
        </label>
        <input
          type="number"
          className="mt-1 w-full p-2 border rounded"
          value={formData.temperature_c}
          onChange={(e) => setFormData({ ...formData, temperature_c: parseFloat(e.target.value) })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Volume (ml)
        </label>
        <input
          type="number"
          className="mt-1 w-full p-2 border rounded"
          value={formData.volume_ml}
          onChange={(e) => setFormData({ ...formData, volume_ml: parseFloat(e.target.value) })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <select
          className="mt-1 w-full p-2 border rounded"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        >
          <option value="incubator">Incubator</option>
          <option value="freezer">Freezer</option>
          <option value="fridge">Fridge</option>
          <option value="bench">Bench</option>
        </select>
      </div>

      <div className="flex space-x-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  )
} 