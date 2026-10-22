import { v4 as uuid } from "uuid"
import { hanzify, cedict, freedict } from "./db"
import type { DictionaryEntry, FreedictEntry } from "./types"
import type { Card, Deck, StoredProgress, Video } from "./schema"

// ── Chinese database ───────────────────────────────────────────────────────

class Database {
  // ── Decks ────────────────────────────────────────────────────────────────

  getDecks() {
    return hanzify.decks.toArray()
  }

  getDeck(id: string) {
    return hanzify.decks.get(id)
  }

  async createDeck(name: string): Promise<Deck> {
    const now = new Date().toISOString()
    const deck: Deck = { id: uuid(), name, created_at: now, updated_at: now }
    await hanzify.decks.add(deck)
    return deck
  }

  async updateDeck(id: string, name: string) {
    await hanzify.decks.update(id, {
      name,
      updated_at: new Date().toISOString(),
    })
  }

  async deleteDeck(id: string) {
    const cards = await hanzify.cards.where("deck_id").equals(id).toArray()
    const cardIds = cards.map((c) => c.id)
    await Promise.all([
      hanzify.cards.bulkDelete(cardIds),
      hanzify.progress.bulkDelete(cardIds),
      hanzify.decks.delete(id),
    ])
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  getCards() {
    return hanzify.cards.toArray()
  }

  getCardsByDeck(deckId: string) {
    return hanzify.cards.where("deck_id").equals(deckId).toArray()
  }

  async addCard(deckId: string, articleId: string): Promise<Card> {
    const card: Card = {
      id: uuid(),
      deck_id: deckId,
      article_id: articleId,
      created_at: new Date().toISOString(),
    }
    await hanzify.cards.add(card)
    return card
  }

  async deleteCard(id: string) {
    await Promise.all([hanzify.cards.delete(id), hanzify.progress.delete(id)])
  }

  // ── Articles (from cedict, keyed by simplified) ───────────────────────────

  async getArticlesByIds(
    ids: string[]
  ): Promise<Record<string, DictionaryEntry>> {
    const entries = await cedict.dictionary
      .where("simplified")
      .anyOf(ids)
      .toArray()
    return Object.fromEntries(entries.map((e) => [e.simplified, e]))
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  getAllProgress() {
    return hanzify.progress.toArray()
  }

  getCardProgress(card_id: string) {
    return hanzify.progress.get(card_id)
  }

  putProgress(progress: StoredProgress) {
    return hanzify.progress.put(progress)
  }

  // ── Videos ────────────────────────────────────────────────────────────────

  getVideos() {
    return hanzify.videos.orderBy("created_at").reverse().toArray()
  }

  getVideo(id: string) {
    return hanzify.videos.get(id)
  }

  async createVideo(
    title: string,
    youtubeUrl: string,
    subtitles: string | null
  ): Promise<Video> {
    const video: Video = {
      id: uuid(),
      title,
      youtube_url: youtubeUrl,
      subtitles,
      created_at: new Date().toISOString(),
    }
    await hanzify.videos.add(video)
    return video
  }

  deleteVideo(id: string) {
    return hanzify.videos.delete(id)
  }

  // ── Maintenance ───────────────────────────────────────────────────────────

  async clearAll() {
    await Promise.all(hanzify.tables.map((t) => t.clear()))
  }
}

// ── English-Russian database ───────────────────────────────────────────────

class EnRuDatabase {
  // ── Decks ────────────────────────────────────────────────────────────────

  getDecks() {
    return freedict.decks.toArray()
  }

  getDeck(id: string) {
    return freedict.decks.get(id)
  }

  async createDeck(name: string): Promise<Deck> {
    const now = new Date().toISOString()
    const deck: Deck = { id: uuid(), name, created_at: now, updated_at: now }
    await freedict.decks.add(deck)
    return deck
  }

  async updateDeck(id: string, name: string) {
    await freedict.decks.update(id, {
      name,
      updated_at: new Date().toISOString(),
    })
  }

  async deleteDeck(id: string) {
    const cards = await freedict.cards.where("deck_id").equals(id).toArray()
    const cardIds = cards.map((c) => c.id)
    await Promise.all([
      freedict.cards.bulkDelete(cardIds),
      freedict.progress.bulkDelete(cardIds),
      freedict.decks.delete(id),
    ])
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  getCards() {
    return freedict.cards.toArray()
  }

  getCardsByDeck(deckId: string) {
    return freedict.cards.where("deck_id").equals(deckId).toArray()
  }

  async addCard(deckId: string, articleId: string): Promise<Card> {
    const card: Card = {
      id: uuid(),
      deck_id: deckId,
      article_id: articleId,
      created_at: new Date().toISOString(),
    }
    await freedict.cards.add(card)
    return card
  }

  async deleteCard(id: string) {
    await Promise.all([freedict.cards.delete(id), freedict.progress.delete(id)])
  }

  // ── Entries (from freedict, keyed by word) ────────────────────────────────

  async getEntriesByIds(ids: string[]): Promise<Record<string, FreedictEntry>> {
    const entries = await freedict.entries.where("word").anyOf(ids).toArray()
    return Object.fromEntries(entries.map((e) => [e.word, e]))
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  getAllProgress() {
    return freedict.progress.toArray()
  }

  getCardProgress(card_id: string) {
    return freedict.progress.get(card_id)
  }

  putProgress(progress: StoredProgress) {
    return freedict.progress.put(progress)
  }

  // ── Videos ────────────────────────────────────────────────────────────────

  getVideos() {
    return freedict.videos.orderBy("created_at").reverse().toArray()
  }

  getVideo(id: string) {
    return freedict.videos.get(id)
  }

  async createVideo(
    title: string,
    youtubeUrl: string,
    subtitles: string | null
  ): Promise<Video> {
    const video: Video = {
      id: uuid(),
      title,
      youtube_url: youtubeUrl,
      subtitles,
      created_at: new Date().toISOString(),
    }
    await freedict.videos.add(video)
    return video
  }

  deleteVideo(id: string) {
    return freedict.videos.delete(id)
  }

  // ── Maintenance ───────────────────────────────────────────────────────────

  async clearAll() {
    await Promise.all(
      freedict.tables.filter((t) => t.name !== "entries").map((t) => t.clear())
    )
  }
}

export const db = new Database()
export const dbEn = new EnRuDatabase()
