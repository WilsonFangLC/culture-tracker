export interface Passage {
  id: number
  start_time: string
  seed_count: number
  harvest_count: number
  generation: number
  user_id: number
}

export interface PassageCreate {
  start_time: string
  seed_count: number
  harvest_count: number
} 