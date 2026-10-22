import React from "react"

export type Language = "zh" | "en-ru"

const STORAGE_KEY = "hanzify-language"

const LanguageContext = React.createContext<{
  language: Language
  setLanguage: (l: Language) => void
}>({
  language: "en-ru",
  setLanguage: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "en-ru" ? "en-ru" : "zh"
  })

  function setLanguage(l: Language) {
    setLanguageState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  return (
    <LanguageContext value={{ language, setLanguage }}>
      {children}
    </LanguageContext>
  )
}

export function useLanguage() {
  return React.useContext(LanguageContext)
}
