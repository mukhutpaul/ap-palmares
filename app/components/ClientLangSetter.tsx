'use client'
import { useEffect } from 'react'

export default function ClientLangSetter() {
  useEffect(() => {
    document.documentElement.lang =
      navigator.language.startsWith('en') ? 'en' : 'fr'
  }, [])

  return null
}
