import React from "react"
import { cedict } from "@/db/db"
import type { DictionaryEntry } from "@/db/types"

let cache: DictionaryEntry[] | null = null
let inflight: Promise<DictionaryEntry[]> | null = null

export async function getDictionary(): Promise<DictionaryEntry[]> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = (async () => {
    const count = await cedict.dictionary.count()

    if (count > 0) {
      cache = await cedict.dictionary.toArray()
    } else {
      const { default: raw } = await import("../dicts/cedict.json")
      const entries = (
        raw as {
          simplified: string
          traditional: string
          pinyin: string
          definitions: string[]
        }[]
      ).map((e, i) => ({
        id: i,
        simplified: e.simplified,
        traditional: e.traditional,
        pinyin: e.pinyin,
        definitions: e.definitions,
      }))
      await cedict.dictionary.bulkPut(entries)
      cache = entries
    }

    inflight = null
    return cache!
  })()

  return inflight
}

export function useDictionary() {
  const [entries, setEntries] = React.useState<DictionaryEntry[] | null>(null)

  React.useEffect(() => {
    getDictionary().then(setEntries)
  }, [])

  return { entries, loading: entries === null }
}
