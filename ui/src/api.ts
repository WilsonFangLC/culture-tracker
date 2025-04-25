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

// Add request interceptor for debugging
api.interceptors.request.use(
  req => {
    console.log(`[API Request] ${req.method?.toUpperCase()} ${req.url}`, req.data)
    return req
  },
  err => Promise.reject(err)
)

export interface CellState {
  id: number
  name: string
  timestamp: string
  parent_id?: number
  parameters: Record<string, any>
  notes?: string
  children?: CellState[]
  transition_type?: string
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
    cell_density: number;
    viability: number;
    storage_location: string;
  };
  transition_type?: 'single' | 'split' | 'measurement';
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
      console.log(`[useUpdateState] mutationFn called for state ${id} with parameters:`, parameters)
      const { data } = await api.patch<CellState>(`/states/${id}/`, { parameters })
      console.log(`[useUpdateState] api.patch response for state ${id}:`, data)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['state', data.id], data)
      queryClient.setQueryData(['states'], (oldData?: CellState[]) => {
        if (!oldData) return [data]
        return oldData.map(s => s.id === data.id ? data : s)
      })
    },
  })
} 