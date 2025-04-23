import { useState, useEffect } from 'react'
import { useStates, useTransitions, useCreateTransition, useUpdateTransition, useDeleteTransition } from '../api'
import { CellState, StateTransition } from '../api'

export default function States() {
  const { data: statesData, isLoading: statesLoading, error: statesError } = useStates()
  const { data: transitionsData, isLoading: transitionsLoading, error: transitionsError } = useTransitions()
  const createTransition = useCreateTransition()
  const updateTransition = useUpdateTransition()
  const deleteTransition = useDeleteTransition()

  // Ensure states and transitions are always arrays
  const states = Array.isArray(statesData) ? statesData : []
  const transitions = Array.isArray(transitionsData) ? transitionsData : []

  const [selectedState, setSelectedState] = useState<CellState | null>(null)
  const [newTransition, setNewTransition] = useState<Partial<StateTransition>>({
    state_id: 0,
    transition_type: '',
    parameters: {},
  })

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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cell States</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">States</h2>
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
                </div>
              ))
            )}
          </div>
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
                </div>
              ))
            )}
          </div>

          {selectedState && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold">Create Transition</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Transition Type"
                  className="w-full p-2 border rounded"
                  value={newTransition.transition_type}
                  onChange={(e) =>
                    setNewTransition({
                      ...newTransition,
                      transition_type: e.target.value,
                      state_id: selectedState.id,
                    })
                  }
                />
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => {
                    createTransition.mutate(newTransition as StateTransition)
                    setNewTransition({
                      state_id: 0,
                      transition_type: '',
                      parameters: {},
                    })
                  }}
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