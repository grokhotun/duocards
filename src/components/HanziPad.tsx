import React from "react"
import HanziWriter, { type CharacterJson } from "hanzi-writer"

const CDN = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0"

function charDataLoader(
  char: string,
  onLoad: (data: CharacterJson) => void,
  onError: (err?: unknown) => void
) {
  fetch(`${CDN}/${encodeURIComponent(char)}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`No stroke data for "${char}"`)
      return r.json() as Promise<CharacterJson>
    })
    .then(onLoad)
    .catch(onError)
}

export type PadPhase = "animate" | "guided" | "free"

export type PadControls = { showOutline: () => void }

type Props = {
  character: string
  phase: PadPhase
  onAnimationEnd?: () => void
  onQuizComplete?: (mistakes: number, strokes: number) => void
  onLoadError?: () => void
  onReady?: (controls: PadControls) => void
}

export function HanziPad({
  character,
  phase,
  onAnimationEnd,
  onQuizComplete,
  onLoadError,
  onReady,
}: Props) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const drawRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState(260)

  // Track actual rendered size so HanziWriter always fills the pad
  React.useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      if (w > 0) setSize(w)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const cbRefs = React.useRef({ onAnimationEnd, onQuizComplete, onLoadError, onReady })
  React.useLayoutEffect(() => {
    cbRefs.current = { onAnimationEnd, onQuizComplete, onLoadError, onReady }
  })

  React.useEffect(() => {
    const el = drawRef.current
    if (!el || size === 0) return

    el.innerHTML = ""

    const writer = HanziWriter.create(el, character, {
      width: size,
      height: size,
      padding: Math.round(size * 0.05),
      showOutline: phase === "guided",
      strokeColor: "#1c1c1e",
      outlineColor: "#d1d5db",
      highlightColor: "#2563eb",
      highlightCompleteColor: "#16a34a",
      drawingColor: "#1d4ed8",
      drawingWidth: Math.round(size * 0.1),
      strokeAnimationSpeed: 1.5,
      delayBetweenStrokes: 180,
      charDataLoader,
      onLoadCharDataError: () => cbRefs.current.onLoadError?.(),
    })

    cbRefs.current.onReady?.({ showOutline: () => writer.showOutline() })

    if (phase === "animate") {
      writer.animateCharacter({
        onComplete: () => cbRefs.current.onAnimationEnd?.(),
      })
    } else {
      let mistakes = 0
      let strokes = 0
      writer.quiz({
        showHintAfterMisses: 3,
        onMistake: () => {
          mistakes++
        },
        onCorrectStroke: () => {
          strokes++
        },
        onComplete: () => cbRefs.current.onQuizComplete?.(mistakes, strokes),
      })
    }

    return () => {
      el.innerHTML = ""
    }
  }, [character, phase, size])

  const half = size / 2

  return (
    <div
      ref={wrapperRef}
      className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-border bg-white shadow-inner"
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* 米字格 practice grid */}
      <svg
        className="pointer-events-none absolute inset-0"
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1={half}
          y1="0"
          x2={half}
          y2={size}
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="5 5"
        />
        <line
          x1="0"
          y1={half}
          x2={size}
          y2={half}
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="5 5"
        />
        <line
          x1="0"
          y1="0"
          x2={size}
          y2={size}
          stroke="#f3f4f6"
          strokeWidth="1"
          strokeDasharray="5 5"
        />
        <line
          x1={size}
          y1="0"
          x2="0"
          y2={size}
          stroke="#f3f4f6"
          strokeWidth="1"
          strokeDasharray="5 5"
        />
      </svg>

      <div ref={drawRef} className="absolute inset-0 touch-none" />
    </div>
  )
}
