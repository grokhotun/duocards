import React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { db } from "@/db/service"
import type { Video } from "@/db/schema"
import { loadYTApi, extractVideoId, type YTPlayer } from "@/lib/youtube"
import { parseSubtitles, findActiveCue, type SubtitleCue } from "@/lib/subtitles"
import { getDictionary } from "@/lib/dictionary"
import type { DictionaryEntry } from "@/db/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  const t = Math.floor(s)
  const m = Math.floor(t / 60)
  const sec = t % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

// ── YouTube player hook ────────────────────────────────────────────────────

function useYouTubePlayer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  videoId: string
) {
  const playerRef = React.useRef<YTPlayer | null>(null)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(false)

  React.useEffect(() => {
    let destroyed = false
    let interval: ReturnType<typeof setInterval>

    loadYTApi().then(() => {
      if (destroyed || !containerRef.current) return
      containerRef.current.innerHTML = ""
      const div = document.createElement("div")
      containerRef.current.appendChild(div)

      playerRef.current = new window.YT.Player(div, {
        videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
        },
        events: {
          onReady: () => {
            if (destroyed) return
            setDuration(playerRef.current?.getDuration() ?? 0)
            interval = setInterval(() => {
              const p = playerRef.current
              if (!p) return
              setCurrentTime(p.getCurrentTime())
              setDuration(p.getDuration())
              setIsPlaying(p.getPlayerState() === 1)
            }, 250)
          },
        },
      })
    })

    return () => {
      destroyed = true
      clearInterval(interval)
      playerRef.current?.destroy()
    }
  }, [videoId, containerRef])

  function toggle() {
    const p = playerRef.current
    if (!p) return
    p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo()
  }

  function seekTo(t: number) {
    playerRef.current?.seekTo(t, true)
  }

  function pause() { playerRef.current?.pauseVideo() }
  function play() { playerRef.current?.playVideo() }

  return { currentTime, duration, isPlaying, toggle, seekTo, pause, play }
}

// ── Controls ───────────────────────────────────────────────────────────────

function PlayerControls({
  currentTime,
  duration,
  isPlaying,
  onToggle,
  onSeek,
}: {
  currentTime: number
  duration: number
  isPlaying: boolean
  onToggle: () => void
  onSeek: (t: number) => void
}) {
  const [dragging, setDragging] = React.useState(false)
  const [dragValue, setDragValue] = React.useState(0)

  const displayed = dragging ? dragValue : currentTime

  function skip(delta: number) {
    onSeek(Math.max(0, Math.min(duration, currentTime + delta)))
  }

  return (
    <div className="flex shrink-0 flex-col gap-1 border-b bg-background px-3 py-2">
      {/* seek bar */}
      <div className="flex items-center gap-2">
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {fmt(displayed)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.5}
          value={displayed}
          className="h-1.5 flex-1 cursor-pointer accent-primary"
          onMouseDown={(e) => { setDragging(true); setDragValue(Number((e.target as HTMLInputElement).value)) }}
          onTouchStart={(e) => { setDragging(true); setDragValue(Number((e.target as HTMLInputElement).value)) }}
          onChange={(e) => setDragValue(Number(e.target.value))}
          onMouseUp={(e) => { onSeek(Number((e.target as HTMLInputElement).value)); setDragging(false) }}
          onTouchEnd={(e) => { onSeek(Number((e.target as HTMLInputElement).value)); setDragging(false) }}
        />
        <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">
          {fmt(duration)}
        </span>
      </div>

      {/* playback buttons */}
      <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => skip(-5)} aria-label="-5 сек">
          <SkipBack className="h-4 w-4" />
          <span className="text-xs">5</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onToggle}>
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => skip(5)} aria-label="+5 сек">
          <span className="text-xs">5</span>
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Word popup ─────────────────────────────────────────────────────────────

function WordPopup({ entry, onClose }: { entry: DictionaryEntry; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">{entry.simplified}</DialogTitle>
        </DialogHeader>
        <div className="flex items-baseline gap-3 pt-1">
          <span className="text-5xl font-bold leading-none">{entry.simplified}</span>
          {entry.traditional !== entry.simplified && (
            <span className="text-2xl text-muted-foreground">{entry.traditional}</span>
          )}
        </div>
        <p className="text-base text-muted-foreground">{entry.pinyin}</p>
        <ol className="list-inside list-decimal space-y-1.5 text-sm">
          {entry.definitions.map((def, i) => <li key={i}>{def}</li>)}
        </ol>
      </DialogContent>
    </Dialog>
  )
}

// ── Clickable subtitle ─────────────────────────────────────────────────────

function ClickableSubtitle({
  text,
  onCharTap,
}: {
  text: string
  onCharTap: (text: string, pos: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-1 px-4 py-3">
      {[...text].map((ch, i) =>
        ch.trim() ? (
          <button
            key={i}
            onClick={() => onCharTap(text, i)}
            className="rounded px-0.5 text-lg leading-snug transition-colors hover:bg-muted active:bg-muted"
          >
            {ch}
          </button>
        ) : (
          <span key={i} className="w-2" />
        )
      )}
    </div>
  )
}

// ── Subtitle list ──────────────────────────────────────────────────────────

function SubtitleList({
  cues,
  activeCue,
  onSeek,
}: {
  cues: SubtitleCue[]
  activeCue: SubtitleCue | null
  onSeek: (time: number) => void
}) {
  const activeRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeCue?.index])

  return (
    <div className="flex-1 space-y-0.5 overflow-y-auto pb-4">
      {cues.map((cue) => {
        const isActive = cue.index === activeCue?.index
        return (
          <button
            key={cue.index}
            ref={isActive ? activeRef : null}
            onClick={() => onSeek(cue.start)}
            className={`flex w-full gap-2 rounded-lg px-4 py-2 text-left text-sm transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <span className="shrink-0 tabular-nums opacity-60">{fmt(cue.start)}</span>
            <span>{cue.text}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const [video, setVideo] = React.useState<Video | null | undefined>(undefined)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [wordEntry, setWordEntry] = React.useState<DictionaryEntry | null>(null)

  React.useEffect(() => {
    if (!videoId) return
    db.getVideo(videoId).then((v) => setVideo(v ?? null))
  }, [videoId])

  const ytVideoId = video ? extractVideoId(video.youtube_url) : null
  const { currentTime, duration, isPlaying, toggle, seekTo, pause, play } =
    useYouTubePlayer(containerRef, ytVideoId ?? "")

  const subtitles = video?.subtitles ?? null
  const cues = React.useMemo(() => (subtitles ? parseSubtitles(subtitles) : []), [subtitles])
  const activeCue = findActiveCue(cues, currentTime)

  async function handleCharTap(text: string, pos: number) {
    pause()
    const entries = await getDictionary()
    const chars = [...text]
    for (let len = Math.min(4, chars.length - pos); len >= 1; len--) {
      const word = chars.slice(pos, pos + len).join("")
      const found = entries.find((e) => e.simplified === word || e.traditional === word)
      if (found) { setWordEntry(found); return }
    }
  }

  if (video === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  if (video === null || !ytVideoId) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-center text-muted-foreground">Видео не найдено</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col" style={{ height: "100dvh" }}>
      {/* header */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <p className="truncate text-sm font-medium">{video.title}</p>
      </div>

      {/* player — tap to toggle */}
      <div
        className="relative w-full shrink-0 cursor-pointer bg-black"
        style={{ aspectRatio: "16 / 9" }}
        onClick={toggle}
      >
        <div ref={containerRef} className="yt-player absolute inset-0" />
        {/* play/pause flash indicator */}
        {!isPlaying && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/40 p-4">
              <Play className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* custom controls */}
      <PlayerControls
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onToggle={toggle}
        onSeek={seekTo}
      />

      {/* current subtitle */}
      {cues.length > 0 && (
        <div className="min-h-14 shrink-0 border-b">
          {activeCue ? (
            <ClickableSubtitle text={activeCue.text} onCharTap={handleCharTap} />
          ) : (
            <div className="flex h-14 items-center justify-center">
              <span className="text-sm text-muted-foreground">—</span>
            </div>
          )}
        </div>
      )}

      {/* subtitle list */}
      {cues.length > 0 ? (
        <SubtitleList cues={cues} activeCue={activeCue} onSeek={seekTo} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Субтитры не прикреплены</p>
        </div>
      )}

      {wordEntry && (
        <WordPopup entry={wordEntry} onClose={() => { setWordEntry(null); play() }} />
      )}
    </div>
  )
}
