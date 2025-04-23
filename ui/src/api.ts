import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const api = axios.create({
  withCredentials: true,
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

export interface GrowthMeasurement {
  id: number
  passage_id: number
  timestamp: string
  cell_density: number
}

export interface FreezeEvent {
  id: number
  passage_id: number
  timestamp: string
  vial_count: number
  label?: string
}

export interface Passage {
  id: number
  start_time: string
  harvest_time: string
  seed_count: number
  harvest_count: number
  generation: number
  doubling_time_hours?: number
  cumulative_pd?: number
  parent_id?: number
  measurements?: GrowthMeasurement[]
  freeze_events?: FreezeEvent[]
  children?: Passage[]
}

export interface PassageCreate {
  start_time: string
  harvest_time: string
  seed_count: number
  harvest_count: number
  parent_id?: number
}

export const usePassages = () => {
  return useQuery({
    queryKey: ['passages'],
    queryFn: async () => {
      const { data } = await api.get<Passage[]>('/passages/api/')
      return data
    },
  })
}

export const useCreatePassage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (passage: PassageCreate) => {
      const { data } = await api.post<Passage>('/passages/api/', passage)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passages'] })
    },
  })
}

export const useCreateGrowthMeasurement = (passageId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (measurement: Omit<GrowthMeasurement, 'id'>) => {
      const { data } = await api.post<GrowthMeasurement>(
        `/passages/api/${passageId}/measurements/`,
        measurement
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passages'] })
      queryClient.invalidateQueries({ queryKey: ['passage', passageId] })
    },
  })
}

export const useCreateFreezeEvent = (passageId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (event: Omit<FreezeEvent, 'id'>) => {
      const { data } = await api.post<FreezeEvent>(
        `/passages/api/${passageId}/freeze-events/`,
        event
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passages'] })
      queryClient.invalidateQueries({ queryKey: ['passage', passageId] })
    },
  })
}

export const usePassage = (passageId: number) => {
  return useQuery({
    queryKey: ['passage', passageId],
    queryFn: async () => {
      const { data } = await api.get<Passage>(`/passages/api/${passageId}/`)
      return data
    },
  })
}

export const useDeletePassage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (passageId: number) => {
      await api.delete(`/passages/api/${passageId}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passages'] })
    },
  })
} 