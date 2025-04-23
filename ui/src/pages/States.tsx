import { useState, useEffect } from 'react'
import { useStates, useTransitions, useCreateTransition, useUpdateTransition, useDeleteTransition, useCreateState } from '../api'
import { CellState, StateTransition, StateTransitionCreate, CellStateCreate } from '../api'
import CreateStateForm from '../components/CreateStateForm'
import StateLineage from '../components/StateLineage'

export default function States() {
  const { data: statesData, isLoading: statesLoading, error: statesError } = useStates()
  const [selectedState, setSelectedState] = useState<CellState | null>(null)
  const { data: transitionsData, isLoading: transitionsLoading, error: transitionsError } = useTransitions(selectedState?.id)
  
  const createTransition = useCreateTransition()
  const updateTransition = useUpdateTransition()
  const deleteTransition = useDeleteTransition()
  const createState = useCreateState()

  // Ensure states and transitions are always arrays
  const states = Array.isArray(statesData) ? statesData : []
  const transitions = Array.isArray(transitionsData) ? transitionsData : []

  const [showCreateState, setShowCreateState] = useState(false)
  const [newTransition, setNewTransition] = useState<Partial<StateTransitionCreate>>({
    state_id: 0,
    transition_type: '',
    parameters: {},
  })

  const validTransitionTypes = ['freeze', 'thaw', 'passage', 'split', 'measurement', 'idle']

  // Reset transition form when selected state changes
  useEffect(() => {
    if (selectedState) {
      setNewTransition({
        state_id: selectedState.id,
        transition_type: '',
        parameters: {},
      })
    }
  }, [selectedState])

  const getTransitionType = (transition: StateTransition) => {
    const parameters = transition.parameters
    
    // Check for status changes first
    if (parameters.status) {
      if (parameters.status === 'frozen') return 'freeze'
      if (parameters.status === 'thawed') return 'thaw'
    }
    
    // Check for specific parameters
    if (parameters.split_ratio !== undefined) return 'passage'
    if (parameters.cell_density !== undefined) return 'measurement'
    if (parameters.storage_location !== undefined) return 'freeze'
    if (parameters.viability !== undefined) return 'thaw'
    
    return 'parameter_change'
  }

  const getTransitionDetails = (transition: StateTransition) => {
    const parameters = transition.parameters
    const details = []

    // Status change
    if (parameters.status) {
      details.push(`Status: ${parameters.status}`)
    }

    // Parameter changes
    if (parameters.temperature_c !== undefined) {
      details.push(`Temperature: ${parameters.temperature_c}°C`)
    }
    if (parameters.volume_ml !== undefined) {
      details.push(`Volume: ${parameters.volume_ml}ml`)
    }
    if (parameters.location) {
      details.push(`Location: ${parameters.location}`)
    }

    // Special parameters
    if (parameters.split_ratio !== undefined) {
      details.push(`Split Ratio: ${parameters.split_ratio}`)
    }
    if (parameters.cell_density !== undefined) {
      details.push(`Cell Density: ${parameters.cell_density.toLocaleString()} cells/ml`)
    }
    if (parameters.storage_location) {
      details.push(`Storage Location: ${parameters.storage_location}`)
    }
    if (parameters.viability !== undefined) {
      details.push(`Viability: ${parameters.viability}%`)
    }

    return details.join(', ')
  }

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

  const handleCreateTransition = () => {
    if (!selectedState || !newTransition.transition_type) return
    
    createTransition.mutate({
      state_id: selectedState.id,
      transition_type: newTransition.transition_type,
      parameters: newTransition.parameters || {},
      timestamp: new Date().toISOString(),
    } as StateTransitionCreate)
    
    setNewTransition({
      state_id: selectedState.id,
      transition_type: '',
      parameters: {},
    })
  }

  const handleCreateState = (data: CellStateCreate) => {
    // First create the state
    createState.mutate(data, {
      onSuccess: (newState) => {
        // Then create the transition if specified
        if (data.transition_type) {
          createTransition.mutate({
            state_id: newState.id,
            transition_type: data.transition_type,
            parameters: data.transition_parameters || {},
          } as StateTransitionCreate)
        }
        setShowCreateState(false)
      },
    })
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cell Culture States</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* States Column */}
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
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedState?.id === state.id ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedState(state)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">State {state.id}</div>
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
                          state.parameters.status === 'thawed' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {state.parameters.status}
                        </span>
                      </div>
                      <div>Temperature: {state.parameters.temperature_c}°C</div>
                      <div>Volume: {state.parameters.volume_ml}ml</div>
                      <div>Location: {state.parameters.location}</div>
                      {state.parent_id && (
                        <div className="text-xs text-gray-500">
                          Parent: State {state.parent_id}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {selectedState ? (
            <>
              <StateLineage
                state={selectedState}
                states={states}
                onSelectState={setSelectedState}
              />
              
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  Transitions for State {selectedState.id}
                </h2>
                
                {transitionsLoading ? (
                  <div className="p-4 bg-gray-100 rounded-lg text-gray-500">
                    Loading transitions...
                  </div>
                ) : transitionsError ? (
                  <div className="p-4 bg-red-100 rounded-lg text-red-500">
                    Error loading transitions: {transitionsError.message}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transitions.length === 0 ? (
                      <div className="p-4 bg-gray-100 rounded-lg text-gray-500">
                        No transitions found for this state
                      </div>
                    ) : (
                      transitions.map((transition) => {
                        const transitionType = getTransitionType(transition)
                        return (
                          <div key={transition.id} className="p-4 bg-white rounded-lg shadow-sm hover:shadow transition-shadow">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    transitionType === 'measurement' ? 'bg-purple-100 text-purple-800' :
                                    transitionType === 'passage' ? 'bg-green-100 text-green-800' :
                                    transitionType === 'freeze' ? 'bg-blue-100 text-blue-800' :
                                    transitionType === 'thaw' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {transitionType}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {new Date(transition.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              {getTransitionDetails(transition)}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 bg-gray-100 rounded-lg text-gray-500 text-center">
              Select a state to view lineage and transitions
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 