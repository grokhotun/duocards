import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom"
import { DecksPage } from "./pages/DecksPage"
import { DictionaryPage } from "./pages/DictionaryPage"
import { CardsPage } from "./pages/CardsPage"
import { WritingPage } from "./pages/WritingPage"
import { PracticePage } from "./pages/PracticePage"
import { StatisticsPage } from "./pages/StatisticsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { DictionaryEntryPage } from "./pages/DictionaryEntryPage"
import { EngRusEntryPage } from "./pages/EngRusEntryPage"
import { VideosPage } from "./pages/VideosPage"
import { VideoPlayerPage } from "./pages/VideoPlayerPage"
import { useLanguage } from "./lib/language"

function Layout() {
  const { language } = useLanguage()

  const nav = [
    { to: "/decks", end: false, label: "Колоды" },
    { to: "/dictionary", end: true, label: "Словарь" },
    language === "zh"
      ? { to: "/writing", end: true, label: "Иероглифы" }
      : { to: "/practice", end: true, label: "Практика" },
    { to: "/videos", end: false, label: "Видео" },
    { to: "/statistics", end: true, label: "Статистика" },
    { to: "/settings", end: true, label: "Настройки" },
  ]

  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="mx-auto flex max-w-lg gap-1 overflow-auto px-6 py-2">
          {nav.map(({ to, end, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive
                  ? "rounded-md px-3 py-1.5 text-sm font-medium"
                  : "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Outlet />
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/decks" replace />} />
        <Route path="/decks" element={<DecksPage />} />
        <Route path="/decks/:deckId" element={<CardsPage />} />
        <Route path="/dictionary" element={<DictionaryPage />} />
        <Route path="/dictionary/:entryId" element={<DictionaryEntryPage />} />
        <Route path="/dictionary-engrus/:word" element={<EngRusEntryPage />} />
        <Route path="/writing" element={<WritingPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/videos/:videoId" element={<VideoPlayerPage />} />
      </Route>
    </Routes>
  )
}

export default App
