import React from "react"
import { Rating } from "ts-fsrs"
import { dbEn } from "@/db/service"
import { fsrs } from "@/db/fsrs"
import type { Card, StoredProgress } from "@/db/schema"
import type { FreedictEntry } from "@/db/types"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

type CardData = {
  card: Card
  entry: FreedictEntry
  progress: StoredProgress | undefined
}

const RATINGS: { label: string; rating: Rating; className: string }[] = [
  { label: "Снова",   rating: Rating.Again, className: "border-red-300 text-red-600 hover:bg-red-50" },
  { label: "Трудно",  rating: Rating.Hard,  className: "border-orange-300 text-orange-600 hover:bg-orange-50" },
  { label: "Хорошо",  rating: Rating.Good,  className: "border-blue-300 text-blue-600 hover:bg-blue-50" },
  { label: "Легко",   rating: Rating.Easy,  className: "border-green-300 text-green-600 hover:bg-green-50" },
]

export function PracticePage() {
  const [status, setStatus] = React.useState<"loading" | "empty" | "active" | "done">("loading")
  const [queue, setQueue] = React.useState<CardData[]>([])
  const [idx, setIdx] = React.useState(0)
  const [revealed, setRevealed] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const now = new Date().toISOString()
      const [allCards, allProgress] = await Promise.all([
        dbEn.getCards(),
        dbEn.getAllProgress(),
      ])

      const progressMap = new Map(allProgress.map((p) => [p.id, p]))
      const dueCards = allCards.filter((c) => {
        const p = progressMap.get(c.id)
        return !p || p.due <= now
      })

      if (dueCards.length === 0) { setStatus("empty"); return }

      const entryMap = await dbEn.getEntriesByIds(dueCards.map((c) => c.article_id))
      const q = dueCards.flatMap((card) => {
        const entry = entryMap[card.article_id]
        return entry ? [{ card, entry, progress: progressMap.get(card.id) }] : []
      })

      if (q.length === 0) { setStatus("empty"); return }
      setQueue(q)
      setStatus("active")
    }
    load()
  }, [])

  async function handleRate(rating: Rating) {
    const { card, progress } = queue[idx]
    const prev = progress
      ? { ...progress, due: new Date(progress.due), last_review: progress.last_review ? new Date(progress.last_review) : null }
      : fsrs.create()

    const [next] = fsrs.review(
      prev as Parameters<typeof fsrs.review>[0],
      rating as Parameters<typeof fsrs.review>[1]
    )

    const stored: StoredProgress = {
      id: card.id,
      due: (next.due as Date).toISOString(),
      stability: next.stability,
      difficulty: next.difficulty,
      scheduled_days: next.scheduled_days,
      reps: next.reps,
      lapses: next.lapses,
      learning_steps: next.learning_steps,
      state: next.state,
      last_review: next.last_review ? (next.last_review as Date).toISOString() : null,
    }

    await dbEn.putProgress(stored)

    const next_idx = idx + 1
    if (next_idx >= queue.length) {
      setStatus("done")
    } else {
      setIdx(next_idx)
      setRevealed(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  if (status === "empty") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-6 pt-20">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <p className="text-lg font-medium">Нет карточек для повторения</p>
        <p className="text-sm text-muted-foreground">Добавьте слова в колоду или вернитесь позже</p>
      </div>
    )
  }

  if (status === "done") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-6 pt-20">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <p className="text-lg font-medium">Повторение завершено!</p>
        <p className="text-sm text-muted-foreground">Пройдено карточек: {queue.length}</p>
      </div>
    )
  }

  const { entry } = queue[idx]
  const total = queue.length

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Практика</h1>
        <span className="text-sm text-muted-foreground">{idx + 1} / {total}</span>
      </div>

      {/* Card */}
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-3xl font-bold">{entry.word}</p>
        {entry.pos && (
          <span className="mt-2 inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {entry.pos}
          </span>
        )}

        {revealed ? (
          <ol className="mt-6 list-inside list-decimal space-y-2 border-t pt-5">
            {entry.translations.map((t, i) => (
              <li key={i} className="text-base">{t}</li>
            ))}
          </ol>
        ) : (
          <div className="mt-6 border-t pt-5">
            <Button className="w-full" onClick={() => setRevealed(true)}>
              Показать перевод
            </Button>
          </div>
        )}
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(({ label, rating, className }) => (
            <Button
              key={label}
              variant="outline"
              className={className}
              onClick={() => handleRate(rating)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
