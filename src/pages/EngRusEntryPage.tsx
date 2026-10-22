import React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Volume2, VolumeX } from "lucide-react"
import { getEngRus } from "@/lib/engrus"
import type { FreedictEntry } from "@/db/types"
import { useTTS } from "@/lib/tts"
import { Button } from "@/components/ui/button"

const POS_LABELS: Record<string, string> = {
  n: "существительное",
  v: "глагол",
  adj: "прилагательное",
  adv: "наречие",
  pn: "имя собственное",
  suffix: "суффикс",
  prefix: "префикс",
  prep: "предлог",
  conj: "союз",
  interj: "междометие",
  num: "числительное",
}

export function EngRusEntryPage() {
  const { word } = useParams<{ word: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = React.useState<FreedictEntry | null | undefined>(undefined)
  const { speak, stop, speaking, supported } = useTTS()

  React.useEffect(() => {
    const decoded = decodeURIComponent(word ?? "")
    getEngRus().then((entries) => {
      setEntry(entries.find((e) => e.word === decoded) ?? null)
    })
  }, [word])

  if (entry === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  if (entry === null) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-center text-muted-foreground">Статья не найдена</p>
      </div>
    )
  }

  const posLabel = entry.pos ? (POS_LABELS[entry.pos] ?? entry.pos) : null

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft />
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl font-bold leading-tight">{entry.word}</h1>
          {posLabel && (
            <p className="mt-2 text-sm text-muted-foreground">{posLabel}</p>
          )}
        </div>

        {supported && (
          <Button
            variant="outline"
            size="icon"
            className="mt-1 shrink-0"
            onClick={() => (speaking ? stop() : speak(entry.word))}
            aria-label={speaking ? "Остановить" : "Произнести"}
          >
            {speaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Переводы
        </p>
        <ol className="list-inside list-decimal space-y-2">
          {entry.translations.map((t, i) => (
            <li key={i} className="text-base">{t}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
