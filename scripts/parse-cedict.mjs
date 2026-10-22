import { createReadStream, createWriteStream } from "fs"
import { createInterface } from "readline"

const INPUT = new URL("../cedict_1_0_ts_utf-8_mdbg.txt", import.meta.url)
  .pathname
const OUTPUT = new URL("../src/dicts/cedict.json", import.meta.url).pathname

// 漢字 汉字 [han4 zi4] /def1/def2/
const LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/

const entries = []

const rl = createInterface({
  input: createReadStream(INPUT, "utf-8"),
  crlfDelay: Infinity,
})

for await (const line of rl) {
  if (line.startsWith("#")) continue

  const m = LINE_RE.exec(line)
  if (!m) continue

  entries.push({
    traditional: m[1],
    simplified: m[2],
    pinyin: m[3],
    definitions: m[4].split("/").filter(Boolean),
  })
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

console.log(`Done: ${entries.length} entries → cedict.json`)
