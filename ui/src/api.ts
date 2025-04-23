import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Add error interceptor
api.interceptors.response.use(
  res => res,
  err => {
    console.error("API error:", err.response?.status, err.response?.data);
    return Promise.reject(err);
  }
)

export interface CellState {
  id: number
  name: string
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
  parameters: {
    status?: string;
    temperature_c?: number;
    volume_ml?: number;
    location?: string;
    split_ratio?: number;
    cell_density?: number;
    viability?: number;
    storage_location?: string;
  }
  notes?: string
}

export interface StateTransitionCreate {
  state_id: number
  transition_type: string
  parameters: {
    status?: string;
    temperature_c?: number;
    volume_ml?: number;
    location?: string;
    split_ratio?: number;
    cell_density?: number;
    viability?: number;
    storage_location?: string;
  }
  notes?: string
}

export interface StateTransitionUpdate {
  transition_type?: string
  parameters?: Record<string, any>
  notes?: string
}

export interface CellStateCreate {
  name: string;
  timestamp: string;
  parent_id?: number;
  parameters: {
    status: string;
    temperature_c: number;
    volume_ml: number;
    location: string;
  };
  transition_type?: string;
  transition_parameters?: Record<string, any>;
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

export const useTransitions = (stateId?: number) => {
  return useQuery({
    queryKey: ['transitions', stateId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (stateId) params.append('state_id', stateId.toString())
      const { data } = await api.get<StateTransition[]>(`/transitions/?${params.toString()}`)
      return data
    },
    enabled: stateId !== undefined,
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

export const useCreateState = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (state: CellStateCreate) => {
      const { data } = await api.post<CellState>('/states/', state)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['states'] })
    },
  })
}

export const useUpdateState = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, parameters }: { id: number; parameters: Record<string, any> }) => {
      const { data } = await api.patch<CellState>(`/states/${id}/`, { parameters })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['states'] })
    },
  })
} 