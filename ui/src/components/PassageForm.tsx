import React, { useState } from 'react'
// import { PassageCreate, usePassages } from '../api' // Commented out: Missing API exports

interface PassageFormProps {
  // onSubmit: (data: PassageCreate) => Promise<void> // Commented out
  onSubmit: (data: any) => Promise<void> // Using any as temporary type
  isSubmitting?: boolean
}

// export default function PassageForm({ onSubmit, isSubmitting }: PassageFormProps) { // Commented out
export default function PassageForm({ onSubmit, isSubmitting }: PassageFormProps) {
  // const { data: passages = [] } = usePassages() // Commented out
  const passages: any[] = []; // Using empty array as placeholder

  const [formData, setFormData] = useState<any>({
    // Initial form state based on PassageCreate structure or defaults
    name: '',
    parent_id: null,
    start_time: new Date().toISOString().slice(0, 16),
    seed_count: '',
    harvest_count: '',
    doubling_time_hours: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: name === 'parent_id' ? (value ? parseInt(value, 10) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Convert types before submitting if necessary
    const submitData = {
      ...formData,
      seed_count: formData.seed_count ? parseFloat(formData.seed_count) : undefined,
      harvest_count: formData.harvest_count ? parseFloat(formData.harvest_count) : undefined,
      doubling_time_hours: formData.doubling_time_hours ? parseFloat(formData.doubling_time_hours) : undefined,
    };
    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields go here based on PassageCreate structure */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 input-field" />
      </div>
      <div>
        <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700">Parent Passage</label>
        <select name="parent_id" id="parent_id" value={formData.parent_id ?? ''} onChange={handleChange} className="mt-1 input-field">
          <option value="">None (Root)</option>
          {passages.map((passage: any) => (
            <option key={passage.id} value={passage.id}>Passage {passage.id} ({passage.name})</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Start Time</label>
        <input type="datetime-local" name="start_time" id="start_time" value={formData.start_time} onChange={handleChange} className="mt-1 input-field" />
      </div>
      <div>
        <label htmlFor="seed_count" className="block text-sm font-medium text-gray-700">Seed Count</label>
        <input type="number" name="seed_count" id="seed_count" value={formData.seed_count} onChange={handleChange} className="mt-1 input-field" />
      </div>
       <div>
        <label htmlFor="harvest_count" className="block text-sm font-medium text-gray-700">Harvest Count</label>
        <input type="number" name="harvest_count" id="harvest_count" value={formData.harvest_count} onChange={handleChange} className="mt-1 input-field" />
      </div>
       <div>
        <label htmlFor="doubling_time_hours" className="block text-sm font-medium text-gray-700">Doubling Time (hours)</label>
        <input type="number" name="doubling_time_hours" id="doubling_time_hours" value={formData.doubling_time_hours} onChange={handleChange} className="mt-1 input-field" />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 input-field" />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Passage'}
      </button>
    </form>
  );
}

// Helper style for input fields
const styles = `
.input-field {
  display: block;
  width: 100%;
  border-radius: 0.375rem; /* rounded-md */
  border-width: 1px;
  border-color: #D1D5DB; /* border-gray-300 */
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* shadow-sm */
}
.input-field:focus {
  border-color: #6366F1; /* focus:border-indigo-500 */
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #6366F1; /* focus:ring-indigo-500 */
}
@media (min-width: 640px) {
  .input-field {
    font-size: 0.875rem; /* sm:text-sm */
    line-height: 1.25rem;
  }
}
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet); 