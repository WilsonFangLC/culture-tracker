import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: false,  // Disable credentials for now
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add error interceptor
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 422) {
      // Handle validation errors from FastAPI
      const detail = err.response.data.detail
      if (Array.isArray(detail)) {
        // Handle multiple validation errors
        const messages = detail.map(error => {
          if (error.loc && error.msg) {
            // Format: "field_name: error message"
            const field = error.loc[error.loc.length - 1]
            return `${field}: ${error.msg}`
          }
          return error.msg || error.message
        }).join('\n')
        throw new Error(messages)
      } else if (typeof detail === 'string') {
        // Handle single validation error
        throw new Error(detail)
      }
      // If we can't parse the error, throw a generic message
      throw new Error('Validation failed. Please check your input.')
    }
    console.error("API error:", err.response?.status, err.response?.data);
    return Promise.reject(err);
  }
)

export interface CellState {
  id: number
  timestamp: string
  parent_id?: number
  parameters: Record<string, any>
  notes?: string
  children?: CellState[]
  transitions?: StateTransition[]
}

export interface StateTransition {
  id: number
  state_id: number
  timestamp: string
  transition_type: string
  parameters: Record<string, any>
  notes?: string
}

export interface StateTransitionCreate {
  state_id: number
  transition_type: string
  parameters: Record<string, any>
  notes?: string
}

export interface StateTransitionUpdate {
  transition_type?: string
  parameters?: Record<string, any>
  notes?: string
}

export const useStates = () => {
  return useQuery({
    queryKey: ['states'],
    queryFn: async () => {
      const { data } = await api.get<CellState[]>('/states/')
      return data
    },
  })
}

export const useState = (stateId: number) => {
  return useQuery({
    queryKey: ['state', stateId],
    queryFn: async () => {
      const { data } = await api.get<CellState>(`/states/${stateId}/`)
      return data
    },
  })
}

export const useTransitions = (stateId?: number, transitionType?: string) => {
  return useQuery({
    queryKey: ['transitions', stateId, transitionType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (stateId) params.append('state_id', stateId.toString())
      if (transitionType) params.append('transition_type', transitionType)
      const { data } = await api.get<StateTransition[]>(`/transitions/?${params.toString()}`)
      return data
    },
  })
}

export const useCreateTransition = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (transition: StateTransitionCreate) => {
      const { data } = await api.post<StateTransition>('/transitions/', transition)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transitions'] })
    },
  })
}

export const useUpdateTransition = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: StateTransitionUpdate & { id: number }) => {
      const { data: response } = await api.patch<StateTransition>(`/transitions/${id}/`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transitions'] })
    },
  })
}

export const useDeleteTransition = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (transitionId: number) => {
      await api.delete(`/transitions/${transitionId}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transitions'] })
    },
  })
} 