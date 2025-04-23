import { useCreateGrowthMeasurement, usePassage, usePassages } from '../api'
import { Passage, GrowthMeasurement } from '../api'
import GrowthMeasurementForm from './GrowthMeasurementForm'

interface PassageDetailsProps {
  passage: Passage
}

export default function PassageDetails({ passage }: PassageDetailsProps) {
  const { data: passageData, refetch } = usePassage(passage.id)
  const { data: allPassages = [] } = usePassages()
  const createMeasurement = useCreateGrowthMeasurement(passage.id)

  const handleCreateMeasurement = async (data: Omit<GrowthMeasurement, 'id'>) => {
    try {
      await createMeasurement.mutateAsync(data)
      await refetch()
    } catch (error) {
      console.error('Failed to create measurement:', error)
    }
  }

  if (!passageData) {
    return <div>Loading...</div>
  }

  const parentPassage = passageData.parent_id ? allPassages.find(p => p.id === passageData.parent_id) : null
  const childPassages = allPassages.filter(p => p.parent_id === passageData.id)

  return (
    <div className="p-4 bg-gray-50">
      {/* Lineage Information Section */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-4">Lineage Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Parent Passage</h4>
            {parentPassage ? (
              <div className="mt-2">
                <p>ID: {parentPassage.id}</p>
                <p>Start: {new Date(parentPassage.start_time).toLocaleString()}</p>
                <p>Generation: {parentPassage.generation}</p>
                <p>Cumulative PD: {parentPassage.cumulative_pd?.toFixed(2) || '-'}</p>
              </div>
            ) : (
              <p className="mt-2 text-gray-500">No parent passage</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Child Passages</h4>
            {childPassages.length > 0 ? (
              <div className="mt-2">
                {childPassages.map(child => (
                  <div key={child.id} className="mb-2">
                    <p>ID: {child.id}</p>
                    <p>Start: {new Date(child.start_time).toLocaleString()}</p>
                    <p>Generation: {child.generation}</p>
                    <p>Cumulative PD: {child.cumulative_pd?.toFixed(2) || '-'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-gray-500">No child passages</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-500">Current Passage Details</h4>
          <div className="mt-2">
            <p>Generation: {passageData.generation}</p>
            <p>Cumulative PD: {passageData.cumulative_pd?.toFixed(2) || '-'}</p>
          </div>
        </div>
      </div>

      {/* Growth Measurements Section */}
      <div className="space-y-4">
        <h3 className="font-semibold">Growth Measurements</h3>
        <div className="bg-white p-4 rounded shadow">
          <GrowthMeasurementForm
            passageId={passage.id}
            onSubmit={handleCreateMeasurement}
            isSubmitting={createMeasurement.isPending}
          />
        </div>
        {passageData.measurements?.length ? (
          <div className="bg-white p-4 rounded shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Cell Density</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {passageData.measurements.map((measurement) => (
                  <tr key={measurement.id}>
                    <td className="px-4 py-2">
                      {new Date(measurement.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{measurement.cell_density}</td>
                    <td className="px-4 py-2">{measurement.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
} 