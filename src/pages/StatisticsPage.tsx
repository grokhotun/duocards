import React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, dbEn } from "@/db/service"
import type { DictionaryEntry, FreedictEntry } from "@/db/types"
import type { Card, StoredProgress } from "@/db/schema"
import { useLanguage } from "@/lib/language"

const STATE_LABELS: Record<number, string> = {
  0: "Новая",
  1: "Изучение",
  2: "Повторение",
  3: "Переизучение",
}

const STATE_COLORS: Record<number, string> = {
  0: "bg-slate-100 text-slate-700",
  1: "bg-blue-100 text-blue-700",
  2: "bg-green-100 text-green-700",
  3: "bg-orange-100 text-orange-700",
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days} дн.`)
  if (hours > 0) parts.push(`${hours} ч.`)
  if (minutes > 0 && days === 0) parts.push(`${minutes} мин.`)
  if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds} сек.`)
  return parts.join(" ") || "0 сек."
}

function formatDue(dueIso: string): { label: string; color: string } {
  const now = new Date()
  const due = new Date(dueIso)
  const diffMs = due.getTime() - now.getTime()

  if (diffMs < 0) {
    return { label: `Просрочено на ${formatDuration(diffMs)}`, color: "text-red-600" }
  }
  return {
    label: `Через ${formatDuration(diffMs)}`,
    color: diffMs < 86400_000 ? "text-yellow-600" : "text-muted-foreground",
  }
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  )
}

function FsrsStats({ progress }: { progress: StoredProgress | undefined }) {
  if (!progress) {
    return <p className="border-t pt-3 text-xs text-muted-foreground">Ещё не повторялась</p>
  }
  const due = formatDue(progress.due)
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-2 border-t pt-3">
      <StatItem label="Следующее повторение" value={<span className={due.color}>{due.label}</span>} />
      <StatItem label="Стабильность" value={`${progress.stability.toFixed(1)} дн.`} />
      <StatItem label="Сложность" value={progress.difficulty.toFixed(2)} />
      <StatItem label="Повторений" value={progress.reps} />
      <StatItem label="Ошибок (lapses)" value={progress.lapses} />
      <StatItem
        label="Последнее"
        value={
          progress.last_review
            ? new Date(progress.last_review).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
            : "—"
        }
      />
    </div>
  )
}

type ZhRow = { card: Card; article: DictionaryEntry; progress: StoredProgress | undefined }
type ErRow = { card: Card; entry: FreedictEntry; progress: StoredProgress | undefined }

function ZhCardRow({ row }: { row: ZhRow }) {
  const { article, progress } = row
  const state = progress?.state ?? 0
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-hanzi text-xl">{article.simplified}</span>
            {article.traditional !== article.simplified && (
              <span className="font-hanzi text-sm text-muted-foreground">{article.traditional}</span>
            )}
            <span className="text-sm text-muted-foreground">{article.pinyin}</span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{article.definitions[0]}</p>
        </div>
        <Badge className={STATE_COLORS[state] ?? STATE_COLORS[0]}>{STATE_LABELS[state] ?? "Новая"}</Badge>
      </div>
      <FsrsStats progress={progress} />
    </div>
  )
}

function ErCardRow({ row }: { row: ErRow }) {
  const { entry, progress } = row
  const state = progress?.state ?? 0
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium">{entry.word}</span>
            {entry.pos && (
              <span className="rounded bg-muted px-1 text-xs text-muted-foreground">{entry.pos}</span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {entry.translations.slice(0, 3).join(", ")}
          </p>
        </div>
        <Badge className={STATE_COLORS[state] ?? STATE_COLORS[0]}>{STATE_LABELS[state] ?? "Новая"}</Badge>
      </div>
      <FsrsStats progress={progress} />
    </div>
  )
}

export function StatisticsPage() {
  const { language } = useLanguage()
  const activeDb = language === "zh" ? db : dbEn

  const cards = useLiveQuery(() => activeDb.getCards(), [language])
  const progressList = useLiveQuery(() => activeDb.getAllProgress(), [language])

  const zhArticles = useLiveQuery(async () => {
    if (!cards || language !== "zh") return {} as Record<string, DictionaryEntry>
    return db.getArticlesByIds(cards.map((c) => c.article_id))
  }, [cards, language])

  const erEntries = useLiveQuery(async () => {
    if (!cards || language !== "en-ru") return {} as Record<string, FreedictEntry>
    return dbEn.getEntriesByIds(cards.map((c) => c.article_id))
  }, [cards, language])

  const progressMap = new Map(progressList?.map((p) => [p.id, p]))

  const now = new Date().toISOString()

  if (!cards || progressList === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  if (language === "zh") {
    const rows: ZhRow[] = (cards ?? [])
      .flatMap((card) => {
        const article = zhArticles?.[card.article_id]
        return article ? [{ card, article, progress: progressMap.get(card.id) }] : []
      })
      .sort((a, b) => {
        if (!a.progress && !b.progress) return 0
        if (!a.progress) return 1
        if (!b.progress) return -1
        return new Date(a.progress.due).getTime() - new Date(b.progress.due).getTime()
      })

    const dueNow = rows.filter((r) => r.progress && r.progress.due <= now).length
    const newCards = rows.filter((r) => !r.progress).length

    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-2xl font-bold">Статистика</h1>
        <div className="grid grid-cols-3 gap-3">
          {[{ label: "Всего", value: rows.length }, { label: "К повторению", value: dueNow }, { label: "Новых", value: newCards }].map(({ label, value }) => (
            <div key={label} className="rounded-xl border p-3 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">Нет карточек — добавьте их в колодах</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => <ZhCardRow key={row.card.id} row={row} />)}
          </div>
        )}
      </div>
    )
  }

  // en-ru
  const rows: ErRow[] = (cards ?? [])
    .flatMap((card) => {
      const entry = erEntries?.[card.article_id]
      return entry ? [{ card, entry, progress: progressMap.get(card.id) }] : []
    })
    .sort((a, b) => {
      if (!a.progress && !b.progress) return 0
      if (!a.progress) return 1
      if (!b.progress) return -1
      return new Date(a.progress.due).getTime() - new Date(b.progress.due).getTime()
    })

  const dueNow = rows.filter((r) => r.progress && r.progress.due <= now).length
  const newCards = rows.filter((r) => !r.progress).length

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-bold">Статистика</h1>
      <div className="grid grid-cols-3 gap-3">
        {[{ label: "Всего", value: rows.length }, { label: "К повторению", value: dueNow }, { label: "Новых", value: newCards }].map(({ label, value }) => (
          <div key={label} className="rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="pt-8 text-center text-sm text-muted-foreground">Нет карточек — добавьте их в колодах</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => <ErCardRow key={row.card.id} row={row} />)}
        </div>
      )}
    </div>
  )
}
