import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const api = axios.create({
  // Use environment variable for base URL, fallback to localhost for development
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
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
  parent_id: number | null
  parameters: Record<string, any> & {
    transition_parameters?: Record<string, any>
  }
  notes?: string
  children?: CellState[]
  transition_type?: string | null
  additional_notes?: string
}

export interface CellStateCreate {
  name: string;
  timestamp: string;
  parent_id?: number;
  parameters: Record<string, any> & {
    transition_parameters?: Record<string, any>
  };
  transition_type?: string;
  additional_notes?: string;
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
      console.log("[useCreateState] Sending payload:", state);
      const { data } = await api.post<CellState>('/states/', state);
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
    mutationFn: async ({ id, parameters, additional_notes }: { 
      id: number; 
      parameters: Record<string, any>;
      additional_notes?: string;
    }) => {
      const payload: { parameters?: Record<string, any>, additional_notes?: string } = {};
      if (parameters) payload.parameters = parameters;
      if (additional_notes !== undefined) payload.additional_notes = additional_notes;

      console.log(`[useUpdateState] mutationFn called for state ${id} with payload:`, payload)
      const { data } = await api.patch<CellState>(`/states/${id}/`, payload);
      console.log(`[useUpdateState] api.patch response for state ${id}:`, data)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['states'] })
      queryClient.invalidateQueries({ queryKey: ['state', data.id] })
    },
  })
}

// Function to delete a cell state
export const deleteCellState = async (stateId: number) => {
  try {
    const response = await api.delete(`/api/cell_states/${stateId}`); // Use the correct endpoint with /api prefix
    // Check for 204 No Content status
    if (response.status !== 204) {
      throw new Error(`API responded with status ${response.status}`);
    }
    return true; // Indicate success
  } catch (error: any) {
    console.error(`Failed to delete state ${stateId}:`, error);
    // Re-throw the error object which might contain response details
    throw error;
  }
};

// Function to get CSV export URL
export const getExportCsvUrl = () => {
  return `${api.defaults.baseURL}/api/export/csv`;
}; 