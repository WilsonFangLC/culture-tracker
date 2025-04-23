import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true,
})

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
      const { data } = await api.get<Passage[]>('/passages')
      return data
    },
  })
}

export const useCreatePassage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (passage: PassageCreate) => {
      const { data } = await api.post<Passage>('/passages', passage)
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
        `/passages/${passageId}/measurements/`,
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
        `/passages/${passageId}/freeze-events/`,
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
      const { data } = await api.get<Passage>(`/passages/${passageId}`)
      return data
    },
  })
}

export const useDeletePassage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (passageId: number) => {
      await api.delete(`/passages/${passageId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passages'] })
    },
  })
} 