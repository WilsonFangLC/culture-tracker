import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ParameterDefinitions } from './utils/parameters'

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
  _type?: string | null
  additional_notes?: string
  transition_type?: string
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
      const { data } = await api.get<CellState[]>('/api/states/')
      return data
    },
  })
}

export const useState = (stateId: number) => {
  return useQuery({
    queryKey: ['state', stateId],
    queryFn: async () => {
      const { data } = await api.get<CellState>(`/api/states/${stateId}/`)
      return data
    },
  })
}

export const useCreateState = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (state: CellStateCreate) => {
      console.log("[useCreateState] Sending payload:", state);
      const { data } = await api.post<CellState>('/api/states/', state);
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['states'] })
    },
  })
}

// Enhanced version of useCreateState that prevents duplicate submissions
export const useSafeCreateState = () => {
  const createStateMutation = useCreateState();
  let isSubmittingFlag = false;
  
  const safeCreate = async (state: CellStateCreate) => {
    if (isSubmittingFlag || createStateMutation.isPending) {
      console.log("[useSafeCreateState] Ignoring duplicate submission while request is in progress");
      return null;
    }
    
    isSubmittingFlag = true;
    try {
      const result = await createStateMutation.mutateAsync(state);
      // Add a small delay before allowing another submission to prevent rapid double-clicks
      setTimeout(() => { isSubmittingFlag = false; }, 1000);
      return result;
    } catch (error) {
      isSubmittingFlag = false;
      throw error;
    }
  };
  
  return {
    ...createStateMutation,
    safeCreate,
    isSubmitting: () => isSubmittingFlag
  };
};

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

      console.log(`[useUpdateState] mutationFn called for state ${id} with payload:`, JSON.stringify(payload, null, 2));
      
      try {
        const { data } = await api.patch<CellState>(`/api/states/${id}/`, payload);
        console.log(`[useUpdateState] api.patch response for state ${id}:`, JSON.stringify(data, null, 2));
        return data;
      } catch (error: any) {
        console.error(`[useUpdateState] Error updating state ${id}:`, error);
        console.error(`[useUpdateState] Error response:`, error.response?.data);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log(`[useUpdateState] onSuccess called with data:`, JSON.stringify(data, null, 2));
      queryClient.invalidateQueries({ queryKey: ['states'] });
      queryClient.invalidateQueries({ queryKey: ['state', data.id] });
    },
    onError: (error) => {
      console.error(`[useUpdateState] onError called:`, error);
    },
  })
}

// Function to delete a cell state
export const deleteCellState = async (stateId: number) => {
  try {
    const response = await api.delete(`/api/cell_states/${stateId}`); // Reverted back to original endpoint that supports DELETE
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

// Hook to fetch parameter definitions from API
export const useParameterDefinitions = () => {
  return useQuery({
    queryKey: ['parameterDefinitions'],
    queryFn: async () => {
      const { data } = await api.get<ParameterDefinitions>('/api/parameters/definitions')
      return data
    },
    // Cache for longer since parameter definitions rarely change
    staleTime: 1000 * 60 * 60, // 1 hour
  })
} 