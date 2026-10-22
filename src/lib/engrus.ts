import React from "react"
import { freedict } from "@/db/db"
import type { FreedictEntry } from "@/db/types"

let cache: FreedictEntry[] | null = null
let inflight: Promise<FreedictEntry[]> | null = null

export async function getEngRus(): Promise<FreedictEntry[]> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = (async () => {
    const count = await freedict.entries.count()

    if (count > 0) {
      cache = await freedict.entries.toArray()
    } else {
      const { default: raw } = await import("../dicts/freedict.json")
      const entries = (
        raw as { word: string; translations: string[]; pos?: string }[]
      ).map((e, i) => ({
        id: i,
        word: e.word,
        translations: e.translations,
        ...(e.pos ? { pos: e.pos } : {}),
      }))
      await freedict.entries.bulkPut(entries)
      cache = entries
    }

    inflight = null
    return cache!
  })()

  return inflight
}

export function useEngRus() {
  const [entries, setEntries] = React.useState<FreedictEntry[] | null>(null)

  React.useEffect(() => {
    getEngRus().then(setEntries)
  }, [])

  return { entries, loading: entries === null }
}
