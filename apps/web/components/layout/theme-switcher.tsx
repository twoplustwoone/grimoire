'use client'

import { useState, useEffect } from 'react'
import { themes, applyTheme, getStoredTheme, type Theme } from '@/lib/theme'
import { Palette } from 'lucide-react'

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>('grimoire')

  useEffect(() => {
    setCurrent(getStoredTheme())
  }, [])

  function handleChange(theme: Theme) {
    applyTheme(theme)
    setCurrent(theme)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value as Theme)}
        className="flex-1 text-sm bg-transparent border-0 text-muted-foreground cursor-pointer focus:outline-none"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
