declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string
          playerVars?: Record<string, unknown>
          events?: {
            onReady?: () => void
            onError?: () => void
          }
        }
      ) => YTPlayer
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export interface YTPlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number  // 1=playing, 2=paused, -1=unstarted, 0=ended
  seekTo(seconds: number, allowSeekAhead: boolean): void
  pauseVideo(): void
  playVideo(): void
  destroy(): void
}

let apiPromise: Promise<void> | null = null

export function loadYTApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise

  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      document.head.appendChild(script)
    }
  })

  return apiPromise
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function thumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}
