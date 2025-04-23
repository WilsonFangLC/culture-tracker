import { useState, useEffect } from 'react'
import { useStates, useTransitions, useCreateTransition, useUpdateTransition, useDeleteTransition, useCreateState } from '../api'
import { CellState, StateTransition, StateTransitionCreate, CellStateCreate } from '../api'
import CreateStateForm from '../components/CreateStateForm'

export default function States() {
  const { data: statesData, isLoading: statesLoading, error: statesError } = useStates()
  const { data: transitionsData, isLoading: transitionsLoading, error: transitionsError } = useTransitions()
  const createTransition = useCreateTransition()
  const updateTransition = useUpdateTransition()
  const deleteTransition = useDeleteTransition()
  const createState = useCreateState()

  // Ensure states and transitions are always arrays
  const states = Array.isArray(statesData) ? statesData : []
  const transitions = Array.isArray(transitionsData) ? transitionsData : []

  const [selectedState, setSelectedState] = useState<CellState | null>(null)
  const [showCreateState, setShowCreateState] = useState(false)
  const [newTransition, setNewTransition] = useState<Partial<StateTransitionCreate>>({
    state_id: 0,
    transition_type: '',
    parameters: {},
  })

  const validTransitionTypes = ['freeze', 'thaw', 'passage', 'split', 'measurement', 'idle']

  // Debug logging
  useEffect(() => {
    console.log('States data:', statesData)
    console.log('Transitions data:', transitionsData)
  }, [statesData, transitionsData])

  if (statesLoading || transitionsLoading) {
    return <div>Loading...</div>
  }

  if (statesError || transitionsError) {
    return (
      <div className="text-red-500">
        Error loading data: {statesError?.message || transitionsError?.message}
      </div>
    )
  }

  const handleCreateTransition = () => {
    if (!selectedState || !newTransition.transition_type) return
    
    createTransition.mutate({
      state_id: selectedState.id,
      transition_type: newTransition.transition_type,
      parameters: newTransition.parameters || {},
      timestamp: new Date().toISOString(),
    } as StateTransitionCreate)
    
    setNewTransition({
      state_id: 0,
      transition_type: '',
      parameters: {},
    })
  }

  const handleCreateState = (data: CellStateCreate) => {
    createState.mutate(data, {
      onSuccess: () => {
        setShowCreateState(false)
      },
    })
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cell States</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
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
            />
          ) : (
            <div className="space-y-2">
              {states.length === 0 ? (
                <div className="p-4 bg-gray-100 rounded-lg text-gray-500">
                  No states found
                </div>
              ) : (
                states.map((state) => (
                  <div
                    key={state.id}
                    className={`p-4 rounded-lg cursor-pointer ${
                      selectedState?.id === state.id ? 'bg-blue-100' : 'bg-white'
                    }`}
                    onClick={() => setSelectedState(state)}
                  >
                    <div className="font-medium">State {state.id}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(state.timestamp).toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm">
                      <div>Status: {state.parameters.status}</div>
                      <div>Temperature: {state.parameters.temperature_c}°C</div>
                      <div>Volume: {state.parameters.volume_ml}ml</div>
                      <div>Location: {state.parameters.location}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Transitions</h2>
          <div className="space-y-2">
            {transitions.length === 0 ? (
              <div className="p-4 bg-gray-100 rounded-lg text-gray-500">
                No transitions found
              </div>
            ) : (
              transitions.map((transition) => (
                <div key={transition.id} className="p-4 bg-white rounded-lg">
                  <div className="font-medium">{transition.transition_type}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(transition.timestamp).toLocaleString()}
                  </div>
                  {Object.entries(transition.parameters).length > 0 && (
                    <div className="mt-2 text-sm">
                      {Object.entries(transition.parameters).map(([key, value]) => (
                        <div key={key}>
                          {key}: {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {selectedState && (
            <div className="mt-8 space-y-4 p-4 bg-white rounded-lg">
              <h3 className="text-lg font-semibold">Create Transition</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transition Type
                  </label>
                  <select
                    className="mt-1 w-full p-2 border rounded"
                    value={newTransition.transition_type}
                    onChange={(e) =>
                      setNewTransition({
                        ...newTransition,
                        transition_type: e.target.value,
                        state_id: selectedState.id,
                      })
                    }
                  >
                    <option value="">Select type...</option>
                    {validTransitionTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {newTransition.transition_type === 'measurement' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cell Density (cells/ml)
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full p-2 border rounded"
                      value={newTransition.parameters?.cell_density || ''}
                      onChange={(e) =>
                        setNewTransition({
                          ...newTransition,
                          parameters: {
                            ...newTransition.parameters,
                            cell_density: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                )}

                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
                  onClick={handleCreateTransition}
                  disabled={!newTransition.transition_type}
                >
                  Create Transition
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 