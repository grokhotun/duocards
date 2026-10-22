import type { DictionaryEntry, FreedictEntry } from "@/db/types"

function score(entry: DictionaryEntry, q: string, ql: string): number {
  let s = 0
  const simp = entry.simplified
  const trad = entry.traditional
  const pinyin = entry.pinyin.toLowerCase()

  // Exact full match
  if (simp === q || trad === q) s += 1000
  // Starts with query
  else if (simp.startsWith(q) || trad.startsWith(q)) s += 500
  // Contains query
  else if (simp.includes(q) || trad.includes(q)) s += 200

  // Pinyin
  if (pinyin === ql) s += 100
  else if (pinyin.startsWith(ql)) s += 50
  else if (pinyin.includes(ql)) s += 20

  // Definition
  if (entry.definitions.some((d) => d.toLowerCase().includes(ql))) s += 5

  // Prefer shorter (more specific) entries
  s -= simp.length

  return s
}

export function searchDictionary(
  entries: DictionaryEntry[],
  query: string,
  limit = 100
): DictionaryEntry[] {
  const q = query.trim()
  if (!q || entries.length === 0) return []
  const ql = q.toLowerCase()

  const hits: { entry: DictionaryEntry; score: number }[] = []
  for (const entry of entries) {
    const s = score(entry, q, ql)
    if (s > 0) hits.push({ entry, score: s })
  }

  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit).map((h) => h.entry)
}

export function searchEngRus(
  entries: FreedictEntry[],
  query: string,
  limit = 100
): FreedictEntry[] {
  const q = query.trim()
  if (!q || entries.length === 0) return []
  const ql = q.toLowerCase()

  const hits: { entry: FreedictEntry; s: number }[] = []
  for (const entry of entries) {
    let s = 0
    const wl = entry.word.toLowerCase()

    if (wl === ql) s += 1000
    else if (wl.startsWith(ql)) s += 500
    else if (wl.includes(ql)) s += 200

    for (const t of entry.translations) {
      const tl = t.toLowerCase()
      if (tl === ql) { s += 500; break }
      else if (tl.startsWith(ql)) { s += 100; break }
      else if (tl.includes(ql)) { s += 30; break }
    }

    s -= entry.word.length

    if (s > 0) hits.push({ entry, s })
  }

  hits.sort((a, b) => b.s - a.s)
  return hits.slice(0, limit).map((h) => h.entry)
}
