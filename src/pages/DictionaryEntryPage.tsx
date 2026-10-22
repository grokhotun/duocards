import React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Volume2, VolumeX } from "lucide-react"
import { getDictionary } from "@/lib/dictionary"
import type { DictionaryEntry } from "@/db/types"
import { useTTS } from "@/lib/tts"
import { Button } from "@/components/ui/button"

export function DictionaryEntryPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = React.useState<DictionaryEntry | null | undefined>(
    undefined
  )
  const { speak, stop, speaking, supported } = useTTS()

  React.useEffect(() => {
    getDictionary().then((entries) => {
      const id = Number(entryId)
      setEntry(entries.find((e) => e.id === id) ?? null)
    })
  }, [entryId])

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

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft />
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-4">
            <span className="font-hanzi text-7xl leading-none">
              {entry.simplified}
            </span>
            {entry.traditional !== entry.simplified && (
              <span className="font-hanzi text-4xl text-muted-foreground">
                {entry.traditional}
              </span>
            )}
          </div>
          <p className="mt-3 text-xl text-muted-foreground">{entry.pinyin}</p>
        </div>

        {supported && (
          <Button
            variant="outline"
            size="icon"
            className="mt-1 shrink-0"
            onClick={() => (speaking ? stop() : speak(entry.simplified))}
            aria-label={speaking ? "Остановить" : "Произнести"}
          >
            {speaking ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Definitions */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Значения
        </p>
        <ol className="list-inside list-decimal space-y-2">
          {entry.definitions.map((def, i) => (
            <li key={i} className="text-base">
              {def}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
