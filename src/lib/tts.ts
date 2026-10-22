import React from "react"
import { useLanguage } from "./language"

export function useTTS() {
  const { language } = useLanguage()
  const [speaking, setSpeaking] = React.useState(false)
  const supported = typeof window !== "undefined" && "speechSynthesis" in window

  const lang = language === "zh" ? "zh-CN" : "en-US"
  const rate = language === "zh" ? 0.85 : 0.9

  function speak(text: string) {
    if (!supported) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = lang
    utt.rate = rate
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }

  function stop() {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  React.useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel()
    },
    [supported]
  )

  return { speak, stop, speaking, supported }
}
