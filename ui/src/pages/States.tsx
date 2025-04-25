import { useState, useEffect } from 'react'
import { useStates, useCreateState, useUpdateState } from '../api'
import { CellState, CellStateCreate } from '../api'
import CreateStateForm from '../components/CreateStateForm'
import StateLineage from '../components/StateLineage'

export default function States() {
  const { data: statesData, isLoading: statesLoading, error: statesError } = useStates()
  const [selectedState, setSelectedState] = useState<CellState | null>(null)
  
  console.log('[States] Initial render:', {
    statesData,
    selectedState,
    isLoading: { states: statesLoading },
    errors: { states: statesError }
  })

  const createState = useCreateState()
  const updateState = useUpdateState()

  // Ensure states are always arrays
  const states = Array.isArray(statesData) ? statesData : []

  console.log('[States] After array conversion:', {
    states: states.length,
    statesNull: statesData === null,
  })

  const [showCreateState, setShowCreateState] = useState(false)

  // Reset selected state when states change
  useEffect(() => {
    console.log('[States] useEffect for state reset:', {
      statesLength: states.length,
      selectedStateId: selectedState?.id,
      stateExists: selectedState ? states.find(s => s.id === selectedState.id) !== undefined : 'no selected state'
    })
    
    if (states.length === 0) {
      setSelectedState(null)
    } else if (selectedState && !states.find(s => s.id === selectedState.id)) {
      setSelectedState(null)
    }
  }, [states, selectedState])

  if (statesLoading) {
    return <div>Loading states...</div>
  }

  if (statesError) {
    return (
      <div className="text-red-500">
        Error loading states: {statesError.message}
      </div>
    )
  }

  const handleCreateState = (data: CellStateCreate[]) => {
    // Create all states in sequence
    const createNextState = (index: number) => {
      if (index >= data.length) {
        setShowCreateState(false)
        return
      }

      const stateData = data[index]
      createState.mutate(stateData, {
        onSuccess: (newState) => {
          // Create next state
          createNextState(index + 1)
        },
      })
    }

    // Start creating states
    createNextState(0)
  }

  const handleUpdateState = async (stateId: number, parameters: any) => {
    console.log('handleUpdateState called with', stateId, parameters)
    try {
      const updated = await updateState.mutateAsync({ id: stateId, parameters })
      console.log('updateState.mutateAsync returned', updated)
      console.log('updateState.parameters:', updated.parameters, 'stringified:', JSON.stringify(updated.parameters, null, 2))
      setSelectedState(updated)
      console.log('setSelectedState to', updated)
    } catch (error) {
      console.error('handleUpdateState error', error)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cell Culture States</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* States List Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">States</h2>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={() => setShowCreateState(true)}
            >
              New State
            </button>
          </div>
          
          {showCreateState ? (
            <CreateStateForm
              onSubmit={handleCreateState}
              onCancel={() => setShowCreateState(false)}
              existingStates={states}
            />
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {states.length === 0 ? (
                <div className="p-4 bg-gray-100 rounded-lg text-gray-500">
                  No states found
                </div>
              ) : (
                states.map((state) => (
                  <div
                    key={state.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedState?.id === state.id ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedState(state)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{state.name || `State ${state.id}`}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(state.timestamp).toLocaleString()}
                        </div>
                      </div>
                      {selectedState?.id === state.id && (
                        <span className="text-blue-500 text-sm">Selected</span>
                      )}
                    </div>
                    <div className="mt-2 text-sm space-y-1">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          state.parameters.status === 'culturing' ? 'bg-green-100 text-green-800' :
                          state.parameters.status === 'frozen' ? 'bg-blue-100 text-blue-800' :
                          state.parameters.status === 'thawed' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {state.parameters.status || 'N/A'}
                        </span>
                      </div>
                      <div><span className="font-medium">Temp:</span> {state.parameters.temperature_c ?? 'N/A'}°C</div>
                      <div><span className="font-medium">Volume:</span> {state.parameters.volume_ml ?? 'N/A'}ml</div>
                      <div><span className="font-medium">Location:</span> {state.parameters.location || 'N/A'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* State Details / Lineage Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">State Lineage & Details</h2>
          {selectedState ? (
            <StateLineage 
              state={selectedState}
              states={states}
              onSelectState={setSelectedState}
              onUpdateState={handleUpdateState}
            />
          ) : (
            <div className="p-4 bg-gray-100 rounded-lg text-gray-500 h-[600px] flex items-center justify-center">
              Select a state from the list to view its details and lineage.
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 