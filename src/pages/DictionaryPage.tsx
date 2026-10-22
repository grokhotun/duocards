import React from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDictionary } from "@/lib/dictionary"
import { useEngRus } from "@/lib/engrus"
import { searchDictionary, searchEngRus } from "@/lib/search"
import { useLanguage } from "@/lib/language"
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function DictionaryPage() {
  const { language } = useLanguage()
  const { entries: zhEntries, loading: zhLoading } = useDictionary()
  const { entries: erEntries, loading: erLoading } = useEngRus()
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, 250)
  const navigate = useNavigate()

  const loading = language === "zh" ? zhLoading : erLoading

  const results = React.useMemo(() => {
    if (language === "zh") return searchDictionary(zhEntries ?? [], debouncedQuery)
    return searchEngRus(erEntries ?? [], debouncedQuery)
  }, [language, zhEntries, erEntries, debouncedQuery])

  const placeholder =
    language === "zh" ? "Иероглифы, пиньинь или перевод…" : "Слово или перевод…"

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-bold">Словарь</h1>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          disabled={loading}
        />
      </div>

      {loading && (
        <p className="text-center text-sm text-muted-foreground">Загрузка словаря…</p>
      )}
      {!loading && debouncedQuery.trim() && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Ничего не найдено</p>
      )}
      {!loading && !debouncedQuery.trim() && (
        <p className="text-center text-sm text-muted-foreground">Начните вводить запрос</p>
      )}

      {language === "zh" ? (
        <div className="space-y-2">
          {(results as ReturnType<typeof searchDictionary>).map((entry) => (
            <button
              key={entry.id}
              onClick={() => navigate(`/dictionary/${entry.id}`)}
              className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/60"
            >
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <span className="font-hanzi text-2xl">{entry.simplified}</span>
                {entry.traditional !== entry.simplified && (
                  <span className="font-hanzi text-lg text-muted-foreground">{entry.traditional}</span>
                )}
                <span className="text-sm text-muted-foreground">{entry.pinyin}</span>
              </div>
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {entry.definitions.slice(0, 2).join("; ")}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(results as ReturnType<typeof searchEngRus>).map((entry) => (
            <button
              key={entry.id}
              onClick={() => navigate(`/dictionary-engrus/${encodeURIComponent(entry.word)}`)}
              className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/60"
            >
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold">{entry.word}</span>
                {entry.pos && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {entry.pos}
                  </span>
                )}
              </div>
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {entry.translations.slice(0, 3).join(", ")}
              </p>
            </button>
          ))}
        </div>
      )}

      {results.length === 100 && (
        <p className="text-center text-xs text-muted-foreground">
          Показаны первые 100 результатов — уточните запрос
        </p>
      )}
    </div>
  )
}
