import { type Card as FSRSProgress } from "ts-fsrs"

export type DictionaryEntry = {
  id: number
  simplified: string
  traditional: string
  pinyin: string
  definitions: string[]
}

export type FreedictEntry = {
  id?: number
  word: string
  translations: string[]
  pos?: string
}

export type Progress = FSRSProgress
