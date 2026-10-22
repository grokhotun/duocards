export interface Card {
  id: string
  deck_id: string
  article_id: string
  created_at: string
}

export interface Deck {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Video {
  id: string
  title: string
  youtube_url: string
  subtitles: string | null
  created_at: string
}

export interface StoredProgress {
  id: string
  due: string
  stability: number
  difficulty: number
  scheduled_days: number
  reps: number
  lapses: number
  learning_steps: number
  state: number
  last_review: string | null
}
