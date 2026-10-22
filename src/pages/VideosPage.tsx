import React from "react"
import { useNavigate } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { Plus, Trash2, Subtitles } from "lucide-react"
import { db } from "@/db/service"
import type { Video } from "@/db/schema"
import { extractVideoId, thumbnailUrl } from "@/lib/youtube"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function AddVideoDialog() {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [url, setUrl] = React.useState("")
  const [subtitles, setSubtitles] = React.useState<string | null>(null)
  const [subtitleName, setSubtitleName] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const videoId = extractVideoId(url)
  const valid = title.trim() && videoId

  function reset() {
    setTitle("")
    setUrl("")
    setSubtitles(null)
    setSubtitleName("")
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubtitleName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setSubtitles(ev.target?.result as string)
    reader.readAsText(file, "utf-8")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    await db.createVideo(title.trim(), url.trim(), subtitles)
    setLoading(false)
    setOpen(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новое видео</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="v-title">Название</Label>
            <Input
              id="v-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: HSK 1 урок 3"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-url">Ссылка YouTube</Label>
            <Input
              id="v-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtu.be/..."
            />
            {url && !videoId && (
              <p className="text-xs text-destructive">
                Неверная ссылка YouTube
              </p>
            )}
          </div>

          {videoId && (
            <img
              src={thumbnailUrl(videoId)}
              alt="preview"
              className="w-full rounded-lg object-cover"
            />
          )}

          <div className="space-y-1.5">
            <Label>Субтитры (SRT / VTT)</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60">
              <Subtitles className="h-4 w-4 shrink-0" />
              {subtitleName || "Выбрать файл с телефона…"}
              <input
                type="file"
                accept=".srt,.vtt"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!valid || loading}>
              {loading ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function VideoCard({ video }: { video: Video }) {
  const navigate = useNavigate()
  const videoId = extractVideoId(video.youtube_url)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    await db.deleteVideo(video.id)
  }

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-xl border transition-colors hover:bg-muted/40"
      onClick={() => navigate(`/videos/${video.id}`)}
    >
      {videoId && (
        <img
          src={thumbnailUrl(videoId)}
          alt={video.title}
          className="w-full object-cover"
        />
      )}
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{video.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {video.subtitles && (
              <span className="flex items-center gap-1">
                <Subtitles className="h-3 w-3" /> Субтитры
              </span>
            )}
            <span>
              {new Date(video.created_at).toLocaleDateString("ru-RU")}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function VideosPage() {
  const videos = useLiveQuery(() => db.getVideos())

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Видео</h1>
        <AddVideoDialog />
      </div>

      {videos?.length === 0 && (
        <p className="pt-8 text-center text-sm text-muted-foreground">
          Нет видео — добавьте первое
        </p>
      )}

      <div className="space-y-3">
        {videos?.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  )
}
