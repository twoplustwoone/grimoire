export type Theme = 'grimoire' | 'minimal' | 'fey'

export const themes: { id: Theme; name: string; description: string }[] = [
  { id: 'grimoire', name: 'Grimoire', description: 'Dark and atmospheric' },
  { id: 'minimal', name: 'Minimal', description: 'Clean and professional' },
  { id: 'fey', name: 'Fey', description: 'Whimsical and colorful' },
]

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'theme-minimal', 'theme-fey')

  if (theme === 'grimoire') {
    root.classList.add('dark')
  } else if (theme === 'minimal') {
    root.classList.add('theme-minimal')
  } else if (theme === 'fey') {
    root.classList.add('theme-fey')
  }

  localStorage.setItem('grimoire-theme', theme)
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'grimoire'
  return (localStorage.getItem('grimoire-theme') as Theme) ?? 'grimoire'
}
