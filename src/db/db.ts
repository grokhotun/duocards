import { Dexie, type EntityTable } from "dexie"
import type { DictionaryEntry, FreedictEntry } from "./types"
import type { Card, Deck, StoredProgress, Video } from "./schema"

function recover(db: Dexie) {
  db.open().catch(async (err: Error) => {
    if (
      err.name === "UpgradeError" ||
      err.name === "DatabaseClosedError" ||
      err.name === "NotFoundError"
    ) {
      await db.delete()
      await db.open()
    }
  })
}

// ── Main app database (Chinese) ────────────────────────────────────────────

const hanzify = new Dexie("hanzify") as Dexie & {
  decks: EntityTable<Deck, "id">
  cards: EntityTable<Card, "id">
  progress: EntityTable<StoredProgress, "id">
  videos: EntityTable<Video, "id">
}

hanzify.version(1).stores({
  articles: "id, simplified, traditional, pinyin",
  decks: "id, name, created_at",
  cards: "id, deck_id, article_id, created_at",
  dictionary: "id, simplified, traditional, pinyin",
  progress: "id, due, state",
})

hanzify.version(6).stores({
  articles: "id, simplified, traditional, pinyin",
  decks: "id, name, created_at",
  cards: "id, deck_id, article_id, created_at",
  dictionary: "id, simplified, traditional, pinyin",
  progress: "id, due, state",
  videos: "id, created_at",
})

hanzify.version(7).stores({
  articles: "id, simplified, traditional, pinyin",
  decks: "id, name, created_at",
  cards: "id, deck_id, article_id, created_at",
  dictionary: null,
  progress: "id, due, state",
  videos: "id, created_at",
})

hanzify.version(8).stores({
  articles: null,
  decks: "id, name, created_at",
  cards: "id, deck_id, article_id, created_at",
  progress: "id, due, state",
  videos: "id, created_at",
})

recover(hanzify)

window.addEventListener("unhandledrejection", async (event) => {
  const err = event.reason as Error | undefined
  if (err?.name === "NotFoundError" && err?.message?.includes("IDBDatabase")) {
    event.preventDefault()
    await hanzify.delete()
    window.location.reload()
  }
})

// ── Chinese dictionary database ────────────────────────────────────────────

const cedict = new Dexie("cedict-english-chinese") as Dexie & {
  dictionary: EntityTable<DictionaryEntry, "id">
}

cedict.version(1).stores({
  dictionary: "id, simplified, traditional, pinyin",
})

recover(cedict)

// ── English-Russian database ───────────────────────────────────────────────

const freedict = new Dexie("freedict-eng-rus") as Dexie & {
  entries: EntityTable<FreedictEntry, "id">
  decks: EntityTable<Deck, "id">
  cards: EntityTable<Card, "id">
  progress: EntityTable<StoredProgress, "id">
  videos: EntityTable<Video, "id">
}

freedict.version(1).stores({
  entries: "++id, word",
})

freedict.version(2).stores({
  entries: "++id, word",
  decks: "id, name, created_at",
  cards: "id, deck_id, article_id, created_at",
  progress: "id, due, state",
  videos: "id, created_at",
})

recover(freedict)

export { hanzify, cedict, freedict }
