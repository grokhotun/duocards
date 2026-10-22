import { readFileSync, createWriteStream } from "fs"
import { fileURLToPath } from "url"
import { resolve, dirname } from "path"

const __dir = dirname(fileURLToPath(import.meta.url))

// Accept an explicit path or fall back to eng-rus.tei in project root
const INPUT = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dir, "../eng-rus.tei")

const OUTPUT = resolve(__dir, "../src/dicts/freedict.json")

const xml = readFileSync(INPUT, "utf-8")

const entries = []
const entryRe = /<entry>([\s\S]*?)<\/entry>/g
let match

while ((match = entryRe.exec(xml)) !== null) {
  const block = match[1]

  const wordMatch = block.match(/<orth>([^<]+)<\/orth>/)
  if (!wordMatch) continue
  const word = wordMatch[1].trim()

  const posMatch = block.match(/<pos>([^<]+)<\/pos>/)
  const pos = posMatch ? posMatch[1].trim() : null

  const translations = []
  const citRe = /<cit type="trans"[^>]*>([\s\S]*?)<\/cit>/g
  let citMatch
  while ((citMatch = citRe.exec(block)) !== null) {
    const quoteRe = /<quote>([^<]+)<\/quote>/g
    let q
    while ((q = quoteRe.exec(citMatch[1])) !== null) {
      const t = q[1].trim()
      if (t && !translations.includes(t)) translations.push(t)
    }
  }

  if (!translations.length) continue

  const entry = { word, translations }
  if (pos) entry.pos = pos
  entries.push(entry)
}

const out = createWriteStream(OUTPUT)
out.write("[\n")
for (let i = 0; i < entries.length; i++) {
  const comma = i < entries.length - 1 ? "," : ""
  out.write(JSON.stringify(entries[i]) + comma + "\n")
}
out.write("]\n")
out.end()

await new Promise((res) => out.on("finish", res))
console.log(`Done: ${entries.length} entries → freedict.json`)
