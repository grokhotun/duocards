import React from "react"
import { useNavigate } from "react-router-dom"
import { Rating, type Card as FSRSCard } from "ts-fsrs"
import { db } from "@/db/service"
import { fsrs } from "@/db/fsrs"
import type { Card, StoredProgress } from "@/db/schema"
import type { DictionaryEntry } from "@/db/types"
import {
  HanziPad,
  type PadPhase,
  type PadControls,
} from "@/components/HanziPad"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle, Eye, RotateCcw } from "lucide-react"

// ─── helpers ────────────────────────────────────────────────────────────────

function isCJK(char: string) {
  const cp = char.codePointAt(0) ?? 0
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  )
}

function errorRateToRating(rate: number) {
  if (rate === 0) return Rating.Easy
  if (rate <= 0.25) return Rating.Good
  if (rate <= 0.6) return Rating.Hard
  return Rating.Again
}

function applyHintPenalty(rating: Rating): Rating {
  if (rating === Rating.Easy) return Rating.Good
  if (rating === Rating.Good) return Rating.Hard
  return rating
}

function toFSRSCard(p: StoredProgress): FSRSCard {
  return {
    due: new Date(p.due),
    stability: p.stability,
    difficulty: p.difficulty,
    scheduled_days: p.scheduled_days,
    reps: p.reps,
    lapses: p.lapses,
    learning_steps: p.learning_steps,
    state: p.state as FSRSCard["state"],
    last_review: p.last_review ? new Date(p.last_review) : undefined,
  } as FSRSCard
}

function fromFSRSCard(cardId: string, c: FSRSCard): StoredProgress {
  return {
    id: cardId,
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    learning_steps: c.learning_steps ?? 0,
    state: c.state as number,
    last_review: c.last_review?.toISOString() ?? null,
  }
}

async function saveProgress(cardId: string, rating: number) {
  const stored = await db.getCardProgress(cardId)
  const fsrsCard: FSRSCard = stored ? toFSRSCard(stored) : fsrs.create()
  const [next] = fsrs.review(
    fsrsCard,
    rating as Parameters<typeof fsrs.review>[1]
  )
  await db.putProgress(fromFSRSCard(cardId, next))
}

// ─── types ───────────────────────────────────────────────────────────────────

type CardData = {
  card: Card
  article: DictionaryEntry
  chars: string[] // CJK chars only
  reps: number
}

type CharResult = { mistakes: number; strokes: number }

type Phase =
  | { type: "animate"; done: boolean }
  | { type: "guided"; round: 0 | 1 }
  | { type: "free" }
  | { type: "result"; mistakes: number; strokes: number }

// ─── sub-components ──────────────────────────────────────────────────────────

function WordHeader({
  article,
  charIdx,
}: {
  article: DictionaryEntry
  charIdx: number
}) {
  const chars = [...article.simplified]
  return (
    <div className="space-y-1 text-center">
      <div className="flex justify-center gap-0.5">
        {chars.map((ch, i) => (
          <span
            key={i}
            className={
              i === charIdx
                ? "font-hanzi text-5xl text-primary"
                : "font-hanzi text-5xl text-muted-foreground/30"
            }
          >
            {ch}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{article.pinyin}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">
        {article.definitions[0]}
      </p>
    </div>
  )
}

function PhaseLabel({ phase }: { phase: Phase }) {
  const labels: Record<string, string> = {
    animate: "Смотрите внимательно",
    free: "Напишите без подсказки",
    result: "",
  }
  if (phase.type === "guided") {
    return (
      <p className="text-sm font-medium text-muted-foreground">
        Попробуйте с подсказкой ({phase.round + 1}/2)
      </p>
    )
  }
  return (
    <p className="text-sm font-medium text-muted-foreground">
      {labels[phase.type] ?? ""}
    </p>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function WritingPage() {
  const navigate = useNavigate()

  const [status, setStatus] = React.useState<
    "loading" | "empty" | "active" | "done"
  >("loading")
  const [queue, setQueue] = React.useState<CardData[]>([])
  const [qIdx, setQIdx] = React.useState(0)
  const [charIdx, setCharIdx] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>({
    type: "animate",
    done: false,
  })
  const [guidedRound, setGuidedRound] = React.useState<0 | 1>(0)
  const [replayCount, setReplayCount] = React.useState(0)
  const [charLoadError, setCharLoadError] = React.useState(false)
  const [hintUsed, setHintUsed] = React.useState(false)
  const padControlsRef = React.useRef<PadControls | null>(null)

  // Accumulated per-character FREE-round results for current card
  const charResultsRef = React.useRef<CharResult[]>([])

  // ── load queue ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    async function load() {
      const now = new Date().toISOString()
      const [allCards, allProgress] = await Promise.all([
        db.getCards(),
        db.getAllProgress(),
      ])

      const progressMap = new Map(allProgress.map((p) => [p.id, p]))
      const dueCards = allCards.filter((c) => {
        const p = progressMap.get(c.id)
        return !p || p.due <= now
      })

      if (dueCards.length === 0) {
        setStatus("empty")
        return
      }

      const articleIds = dueCards.map((c) => c.article_id)
      const articleMap = await db.getArticlesByIds(articleIds)

      const q = dueCards
        .map((card) => {
          const article = articleMap[card.article_id]
          if (!article) return null
          const chars = [...article.simplified].filter(isCJK)
          if (chars.length === 0) return null
          const reps = progressMap.get(card.id)?.reps ?? 0
          return { card, article, chars, reps }
        })
        .filter(Boolean) as CardData[]

      if (q.length === 0) {
        setStatus("empty")
        return
      }

      setQueue(q)
      charResultsRef.current = []
      setStatus("active")
    }

    load()
  }, [])

  // ── derived ────────────────────────────────────────────────────────────
  const current = queue[qIdx]
  const currentChar = current?.chars[charIdx]

  // ── pad key: forces HanziPad remount on every phase/round change ────────
  const padKey = `${qIdx}-${charIdx}-${phase.type}-${phase.type === "guided" ? guidedRound : ""}-${replayCount}`

  // ── handlers ───────────────────────────────────────────────────────────
  function handleAnimationEnd() {
    setPhase({ type: "animate", done: true })
  }

  function handleStartPractice() {
    if (current.reps > 0) {
      setHintUsed(false)
      setPhase({ type: "free" })
    } else {
      setGuidedRound(0)
      setPhase({ type: "guided", round: 0 })
    }
  }

  function handleHint() {
    padControlsRef.current?.showOutline()
    setHintUsed(true)
  }

  function handleReplayAnimation() {
    setReplayCount((c) => c + 1)
    setPhase({ type: "animate", done: false })
  }

  function handleGuidedComplete() {
    if (guidedRound === 0) {
      setGuidedRound(1)
      setPhase({ type: "guided", round: 1 })
    } else {
      setPhase({ type: "free" })
    }
  }

  function handleFreeComplete(mistakes: number, strokes: number) {
    charResultsRef.current = [...charResultsRef.current, { mistakes, strokes }]
    setPhase({ type: "result", mistakes, strokes })
  }

  async function handleNextFromResult() {
    const card = current
    const isLastChar = charIdx >= card.chars.length - 1

    if (!isLastChar) {
      setCharIdx((i) => i + 1)
      setCharLoadError(false)
      setHintUsed(false)
      setGuidedRound(0)
      setPhase({ type: "animate", done: false })
      return
    }

    // All chars done for this card — calculate grade
    const results = charResultsRef.current
    const avgError =
      results.length > 0
        ? results.reduce(
            (sum, r) => sum + (r.strokes > 0 ? r.mistakes / r.strokes : 0),
            0
          ) / results.length
        : 0

    let rating = errorRateToRating(avgError)
    if (hintUsed) rating = applyHintPenalty(rating)
    await saveProgress(card.card.id, rating)

    // Advance to next card
    charResultsRef.current = []
    setHintUsed(false)
    const nextIdx = qIdx + 1

    if (nextIdx < queue.length) {
      setQIdx(nextIdx)
      setCharIdx(0)
      setCharLoadError(false)
      setGuidedRound(0)
      setPhase({ type: "animate", done: false })
    } else {
      setStatus("done")
    }
  }

  function handleSkipChar() {
    // char failed to load — treat as skipped (no result entry)
    handleNextFromResult()
  }

  // ── render guards ───────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  if (status === "empty") {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-2xl">🎉</p>
        <p className="font-medium">Нечего повторять</p>
        <p className="text-sm text-muted-foreground">
          Все карточки повторены или у вас ещё нет добавленных карточек.
        </p>
        <Button variant="outline" onClick={() => navigate("/decks")}>
          К колодам
        </Button>
      </div>
    )
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <p className="text-xl font-bold">Отлично!</p>
        <p className="text-sm text-muted-foreground">
          Повторено карточек: {queue.length}
        </p>
        <Button onClick={() => navigate("/decks")}>К колодам</Button>
      </div>
    )
  }

  // ── active session ──────────────────────────────────────────────────────
  const padPhase: PadPhase =
    phase.type === "guided"
      ? "guided"
      : phase.type === "free"
        ? "free"
        : "animate"

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 p-6">
      {/* header */}
      <div className="flex w-full items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate("/decks")}>
          <ArrowLeft />
        </Button>
        <span className="text-sm text-muted-foreground">
          {qIdx + 1} / {queue.length}
        </span>
        <div className="w-8" />
      </div>

      {/* word display */}
      <WordHeader article={current.article} charIdx={charIdx} />

      {/* pad */}
      {charLoadError ? (
        <div
          className="flex w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center"
          style={{ aspectRatio: "1 / 1" }}
        >
          <p className="text-sm text-muted-foreground">
            Нет данных для «{currentChar}»
          </p>
          <Button size="sm" variant="outline" onClick={handleSkipChar}>
            Пропустить
          </Button>
        </div>
      ) : (
        phase.type !== "result" && (
          <HanziPad
            key={padKey}
            character={currentChar}
            phase={padPhase}
            onAnimationEnd={handleAnimationEnd}
            onQuizComplete={
              padPhase === "guided" ? handleGuidedComplete : handleFreeComplete
            }
            onLoadError={() => setCharLoadError(true)}
            onReady={(controls) => {
              padControlsRef.current = controls
            }}
          />
        )
      )}

      {/* phase label + controls */}
      <div className="flex flex-col items-center gap-4">
        {phase.type !== "result" && <PhaseLabel phase={phase} />}

        {phase.type === "animate" && (
          <div className="flex gap-2">
            {phase.done && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplayAnimation}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Ещё раз
              </Button>
            )}
            <Button onClick={handleStartPractice} disabled={!phase.done}>
              {phase.done ? "Начать упражнения" : "Смотрите…"}
            </Button>
          </div>
        )}

        {phase.type === "free" && !hintUsed && (
          <Button variant="outline" size="sm" onClick={handleHint}>
            <Eye className="mr-1 h-3.5 w-3.5" />
            Подсказка
          </Button>
        )}

        {phase.type === "result" && (
          <ResultCard
            mistakes={phase.mistakes}
            strokes={phase.strokes}
            charIdx={charIdx}
            totalChars={current.chars.length}
            onNext={handleNextFromResult}
          />
        )}
      </div>
    </div>
  )
}

// ─── result card ─────────────────────────────────────────────────────────────

function ResultCard({
  mistakes,
  strokes,
  charIdx,
  totalChars,
  onNext,
}: {
  mistakes: number
  strokes: number
  charIdx: number
  totalChars: number
  onNext: () => void
}) {
  const isLast = charIdx >= totalChars - 1
  const errorRate = strokes > 0 ? mistakes / strokes : 0
  const rating = errorRateToRating(errorRate)

  const label =
    rating === Rating.Easy
      ? "Идеально!"
      : rating === Rating.Good
        ? "Хорошо"
        : rating === Rating.Hard
          ? "С ошибками"
          : "Нужно больше практики"

  const color =
    rating === Rating.Easy
      ? "text-green-600"
      : rating === Rating.Good
        ? "text-blue-600"
        : rating === Rating.Hard
          ? "text-yellow-600"
          : "text-red-600"

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{label}</p>
      {mistakes > 0 && (
        <p className="text-sm text-muted-foreground">
          Ошибок: {mistakes} из {strokes} штрихов ({Math.round(errorRate * 100)}
          %)
        </p>
      )}
      <Button onClick={onNext}>
        {isLast ? "Завершить карточку" : "Следующий иероглиф →"}
      </Button>
    </div>
  )
}
