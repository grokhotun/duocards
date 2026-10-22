import React from "react"
import { Trash2 } from "lucide-react"
import { db } from "@/db/service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useLanguage, type Language } from "@/lib/language"

function ClearDatabaseButton() {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleConfirm() {
    setLoading(true)
    await db.clearAll()
    setOpen(false)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Очистить базу данных
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Очистить базу данных?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Будут удалены все колоды, карточки и прогресс. Действие необратимо.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Удаление…" : "Удалить всё"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const LANGUAGES: { value: Language; label: string; sub: string }[] = [
  { value: "zh", label: "Китайский", sub: "中文 — CC-CEDICT" },
  { value: "en-ru", label: "Английский", sub: "EN → RU — FreeDict" },
]

export function SettingsPage() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Язык словаря
        </h2>
        <div className="rounded-xl border p-4 space-y-2">
          {LANGUAGES.map(({ value, label, sub }) => (
            <button
              key={value}
              onClick={() => setLanguage(value)}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ${
                language === value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/60"
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className={`text-xs ${language === value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {sub}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Служебное
        </h2>
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-sm font-medium">База данных</p>
          <p className="text-xs text-muted-foreground mb-3">
            Удаляет все данные приложения: колоды, карточки, прогресс повторений.
          </p>
          <ClearDatabaseButton />
        </div>
      </section>
    </div>
  )
}
