import React from "react"
import { useNavigate } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { Pencil, Trash2, Plus } from "lucide-react"
import { db, dbEn } from "@/db/service"
import type { Deck } from "@/db/schema"
import { useLanguage } from "@/lib/language"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function DeckFormDialog({
  deck,
  trigger,
}: {
  deck?: Deck
  trigger: React.ReactElement
}) {
  const { language } = useLanguage()
  const activeDb = language === "zh" ? db : dbEn
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(deck?.name ?? "")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setName(deck?.name ?? "")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    if (deck) {
      await activeDb.updateDeck(deck.id, name.trim())
    } else {
      await activeDb.createDeck(name.trim())
    }

    setOpen(false)
    setName("")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {deck ? "Редактировать колоду" : "Новая колода"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deck-name">Название</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: HSK1"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              {deck ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeckCard({ deck }: { deck: Deck }) {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const activeDb = language === "zh" ? db : dbEn

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    await activeDb.deleteDeck(deck.id)
  }

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/40"
      onClick={() => navigate(`/decks/${deck.id}`)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{deck.name}</CardTitle>
          <CardDescription>
            Создана {new Date(deck.created_at).toLocaleDateString("ru-RU")}
          </CardDescription>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <DeckFormDialog
            deck={deck}
            trigger={
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent />
    </Card>
  )
}

export function DecksPage() {
  const { language } = useLanguage()
  const activeDb = language === "zh" ? db : dbEn
  const decks = useLiveQuery(() => activeDb.getDecks(), [language])

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Колоды</h1>
        <DeckFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Создать
            </Button>
          }
        />
      </div>

      {decks?.length === 0 && (
        <p className="text-center text-muted-foreground">
          Нет колод. Создайте первую!
        </p>
      )}

      <div className="space-y-3">
        {decks?.map((deck) => (
          <DeckCard key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  )
}
