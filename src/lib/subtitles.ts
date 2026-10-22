export type SubtitleCue = {
  index: number
  start: number
  end: number
  text: string
}

function parseTime(raw: string): number {
  const s = raw.trim().replace(",", ".")
  const parts = s.split(":")
  if (parts.length === 3) {
    return (
      parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
    )
  }
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1])
  }
  return parseFloat(s)
}

function parseSRT(content: string): SubtitleCue[] {
  const blocks = content.trim().split(/\n\s*\n/)
  const cues: SubtitleCue[] = []
  for (const block of blocks) {
    const lines = block.trim().split("\n")
    if (lines.length < 2) continue
    const timeLine = lines.find((l) => l.includes("-->"))
    if (!timeLine) continue
    const [startRaw, endRaw] = timeLine.split("-->")
    const textLines = lines.slice(lines.indexOf(timeLine) + 1)
    const text = textLines
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim()
    if (!text) continue
    cues.push({
      index: cues.length,
      start: parseTime(startRaw),
      end: parseTime(endRaw),
      text,
    })
  }
  return cues
}

function parseVTT(content: string): SubtitleCue[] {
  const body = content.replace(/^WEBVTT[^\n]*\n/, "")
  return parseSRT(body)
}

export function parseSubtitles(content: string): SubtitleCue[] {
  if (content.trimStart().startsWith("WEBVTT")) return parseVTT(content)
  return parseSRT(content)
}

export function findActiveCue(
  cues: SubtitleCue[],
  time: number
): SubtitleCue | null {
  return cues.findLast((c) => c.start <= time && c.end >= time) ?? null
}
