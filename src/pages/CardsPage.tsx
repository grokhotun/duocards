import React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { ArrowLeft, Check, Plus, Search, Trash2 } from "lucide-react"
import { db, dbEn } from "@/db/service"
import type { Deck } from "@/db/schema"
import type { DictionaryEntry, FreedictEntry } from "@/db/types"
import { getDictionary } from "@/lib/dictionary"
import { getEngRus } from "@/lib/engrus"
import { searchDictionary, searchEngRus } from "@/lib/search"
import { useLanguage } from "@/lib/language"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Add card dialog ────────────────────────────────────────────────────────

function AddCardDialog({ deck, existingIds }: { deck: Deck; existingIds: Set<string> }) {
  const { language } = useLanguage()
  const [open, setOpen] = React.useState(false)
  const [entries, setEntries] = React.useState<(DictionaryEntry | FreedictEntry)[]>([])
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, 250)
  const [pending, setPending] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    if (!open || entries.length > 0) return
    if (language === "zh") getDictionary().then(setEntries)
    else getEngRus().then(setEntries)
  }, [open, language, entries.length])

  // reset entries when language changes so the right dict loads next open
  React.useEffect(() => { setEntries([]) }, [language])

  const results = React.useMemo(() => {
    if (language === "zh")
      return searchDictionary(entries as DictionaryEntry[], debouncedQuery)
    return searchEngRus(entries as FreedictEntry[], debouncedQuery)
  }, [language, entries, debouncedQuery])

  function entryKey(entry: DictionaryEntry | FreedictEntry) {
    return language === "zh"
      ? (entry as DictionaryEntry).simplified
      : (entry as FreedictEntry).word
  }

  async function handleAdd(entry: DictionaryEntry | FreedictEntry) {
    const key = entryKey(entry)
    if (existingIds.has(key) || pending.has(key)) return
    setPending((s) => new Set(s).add(key))
    if (language === "zh") await db.addCard(deck.id, key)
    else await dbEn.addCard(deck.id, key)
    setPending((s) => { const n = new Set(s); n.delete(key); return n })
  }

  const placeholder =
    language === "zh" ? "Иероглифы, пиньинь или перевод…" : "Слово или перевод…"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus />Добавить</Button>} />
      <DialogContent className="flex h-[80vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить карточки</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {entries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Загрузка словаря…</p>
        )}
        {entries.length > 0 && !debouncedQuery.trim() && (
          <p className="py-8 text-center text-sm text-muted-foreground">Введите запрос для поиска</p>
        )}
        {entries.length > 0 && debouncedQuery.trim() && results.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Ничего не найдено</p>
        )}

        <div className="flex-1 space-y-1 overflow-y-auto">
          {results.map((entry) => {
            const key = entryKey(entry)
            const added = existingIds.has(key)
            const loading = pending.has(key)
            return (
              <button
                key={key}
                onClick={() => handleAdd(entry)}
                disabled={added || loading}
                className="flex w-full items-start justify-between gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-60"
              >
                {language === "zh" ? (
                  <div className="min-w-0">
                    <div className="mb-0.5 flex flex-wrap items-baseline gap-2">
                      <span className="font-hanzi text-lg">{(entry as DictionaryEntry).simplified}</span>
                      {(entry as DictionaryEntry).traditional !== (entry as DictionaryEntry).simplified && (
                        <span className="font-hanzi text-sm text-muted-foreground">{(entry as DictionaryEntry).traditional}</span>
                      )}
                      <span className="text-sm text-muted-foreground">{(entry as DictionaryEntry).pinyin}</span>
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {(entry as DictionaryEntry).definitions.slice(0, 2).join("; ")}
                    </p>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="mb-0.5 flex items-baseline gap-2">
                      <span className="font-medium">{(entry as FreedictEntry).word}</span>
                      {(entry as FreedictEntry).pos && (
                        <span className="rounded bg-muted px-1 text-xs text-muted-foreground">
                          {(entry as FreedictEntry).pos}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {(entry as FreedictEntry).translations.slice(0, 3).join(", ")}
                    </p>
                  </div>
                )}
                {added && <Check className="mt-1 h-4 w-4 shrink-0 text-green-500" />}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Card row ───────────────────────────────────────────────────────────────

type CardDisplay =
  | { kind: "zh"; entry: DictionaryEntry; cardId: string }
  | { kind: "en-ru"; entry: FreedictEntry; cardId: string }

function CardRow({ item }: { item: CardDisplay }) {
  async function handleDelete() {
    if (item.kind === "zh") await db.deleteCard(item.cardId)
    else await dbEn.deleteCard(item.cardId)
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border p-4">
      <div className="min-w-0">
        {item.kind === "zh" ? (
          <>
            <div className="mb-1 flex flex-wrap items-baseline gap-2">
              <span className="font-hanzi text-xl">{item.entry.simplified}</span>
              {item.entry.traditional !== item.entry.simplified && (
                <span className="font-hanzi text-muted-foreground">{item.entry.traditional}</span>
              )}
              <span className="text-sm text-muted-foreground">{item.entry.pinyin}</span>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {item.entry.definitions.join("; ")}
            </p>
          </>
        ) : (
          <>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="font-medium">{item.entry.word}</span>
              {item.entry.pos && (
                <span className="rounded bg-muted px-1 text-xs text-muted-foreground">{item.entry.pos}</span>
              )}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {item.entry.translations.join(", ")}
            </p>
          </>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={handleDelete}>
        <Trash2 />
      </Button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export function CardsPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const { language } = useLanguage()

  const activeDb = language === "zh" ? db : dbEn

  const deck = useLiveQuery(() => activeDb.getDeck(deckId!), [deckId, language])
  const cards = useLiveQuery(() => activeDb.getCardsByDeck(deckId!), [deckId, language])

  const zhArticles = useLiveQuery(async () => {
    if (!cards || language !== "zh") return {} as Record<string, DictionaryEntry>
    return db.getArticlesByIds(cards.map((c) => c.article_id))
  }, [cards, language])

  const erEntries = useLiveQuery(async () => {
    if (!cards || language !== "en-ru") return {} as Record<string, FreedictEntry>
    return dbEn.getEntriesByIds(cards.map((c) => c.article_id))
  }, [cards, language])

  const existingIds = React.useMemo(
    () => new Set(cards?.map((c) => c.article_id) ?? []),
    [cards]
  )

  const cardItems: CardDisplay[] = React.useMemo(() => {
    if (!cards) return []
    if (language === "zh") {
      return cards.flatMap((card) => {
        const entry = zhArticles?.[card.article_id]
        return entry ? [{ kind: "zh" as const, entry, cardId: card.id }] : []
      })
    }
    return cards.flatMap((card) => {
      const entry = erEntries?.[card.article_id]
      return entry ? [{ kind: "en-ru" as const, entry, cardId: card.id }] : []
    })
  }, [cards, language, zhArticles, erEntries])

  if (deck === null) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-center text-muted-foreground">Колода не найдена</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate("/decks")}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold">{deck?.name}</h1>
        </div>
        {deck && <AddCardDialog deck={deck} existingIds={existingIds} />}
      </div>

      {cards?.length === 0 && (
        <p className="pt-8 text-center text-sm text-muted-foreground">
          В колоде пока нет карточек — добавьте первую
        </p>
      )}

      <div className="space-y-2">
        {cardItems.map((item) => (
          <CardRow key={item.cardId} item={item} />
        ))}
      </div>
    </div>
  )
}
