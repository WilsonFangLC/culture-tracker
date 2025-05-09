/**
 * DEPRECATED: This component is no longer maintained.
 * This form was part of the Passages feature which has been disabled.
 * Keeping for reference purposes only.
 */
import { useState } from 'react'
// import { GrowthMeasurement } from '../api' // Commented out: GrowthMeasurement not exported from api.ts

interface GrowthMeasurementFormProps {
  passageId: number
  // onSubmit: (data: Omit<GrowthMeasurement, 'id'>) => Promise<void> // Commented out
  onSubmit: (data: any) => Promise<void> // Using any as temporary type
  isSubmitting?: boolean
}

// export default function GrowthMeasurementForm({ passageId, onSubmit, isSubmitting }: GrowthMeasurementFormProps) { // Commented out
export default function GrowthMeasurementForm({ passageId, onSubmit, isSubmitting }: GrowthMeasurementFormProps) {
  const [formData, setFormData] = useState<any>({
    // Initialize form data based on GrowthMeasurement structure or defaults
    timestamp: new Date().toISOString(),
    cell_density: '',
    viability: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Convert types if necessary before submitting
    const submitData = {
      ...formData,
      cell_density: parseFloat(formData.cell_density) || 0,
      viability: parseFloat(formData.viability) || 0,
      passage_id: passageId, // Assuming passage_id is needed
    };
    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields go here, e.g., Timestamp, Cell Density, Viability */}
       <div>
        <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700">Timestamp</label>
        <input
          type="datetime-local"
          name="timestamp"
          id="timestamp"
          value={formData.timestamp}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
       <div>
        <label htmlFor="cell_density" className="block text-sm font-medium text-gray-700">Initial Cell Density (cells/mL)</label>
        <input
          type="number"
          name="cell_density"
          id="cell_density"
          value={formData.cell_density}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
       <div>
        <label htmlFor="viability" className="block text-sm font-medium text-gray-700">Viability (%)</label>
        <input
          type="number"
          name="viability"
          id="viability"
          value={formData.viability}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Adding...' : 'Add Measurement'}
      </button>
    </form>
  );
} 