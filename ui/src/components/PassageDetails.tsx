import { useCreateGrowthMeasurement, useCreateFreezeEvent, usePassage } from '../api'
import { Passage, GrowthMeasurement, FreezeEvent } from '../api'
import GrowthMeasurementForm from './GrowthMeasurementForm'
import FreezeEventForm from './FreezeEventForm'

interface PassageDetailsProps {
  passage: Passage
}

export default function PassageDetails({ passage }: PassageDetailsProps) {
  const { data: passageData, refetch } = usePassage(passage.id)
  const createMeasurement = useCreateGrowthMeasurement(passage.id)
  const createFreezeEvent = useCreateFreezeEvent(passage.id)

  const handleCreateMeasurement = async (data: Omit<GrowthMeasurement, 'id'>) => {
    try {
      await createMeasurement.mutateAsync(data)
      await refetch() // Refresh the passage data to show the new measurement
    } catch (error) {
      console.error('Failed to create measurement:', error)
      // You might want to show an error toast here
    }
  }

  const handleCreateFreezeEvent = async (data: Omit<FreezeEvent, 'id'>) => {
    try {
      await createFreezeEvent.mutateAsync(data)
      await refetch() // Refresh the passage data to show the new freeze event
    } catch (error) {
      console.error('Failed to create freeze event:', error)
      // You might want to show an error toast here
    }
  }

  if (!passageData) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-4 bg-gray-50">
      <div className="grid grid-cols-2 gap-4">
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
                  </tr>
                </thead>
                <tbody>
                  {passageData.measurements.map((measurement) => (
                    <tr key={measurement.id}>
                      <td className="px-4 py-2">
                        {new Date(measurement.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{measurement.cell_density}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">Freeze Events</h3>
          <div className="bg-white p-4 rounded shadow">
            <FreezeEventForm
              passageId={passage.id}
              onSubmit={handleCreateFreezeEvent}
              isSubmitting={createFreezeEvent.isPending}
            />
          </div>
          {passageData.freeze_events?.length ? (
            <div className="bg-white p-4 rounded shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">Vials</th>
                    <th className="px-4 py-2">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {passageData.freeze_events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-2">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{event.vial_count}</td>
                      <td className="px-4 py-2">{event.label || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
} 