export function displaySessionTitle(s: {
  title: string | null
  createdAt?: Date | string | null
}): string {
  if (s.title) return s.title
  if (s.createdAt) {
    const d = typeof s.createdAt === 'string' ? new Date(s.createdAt) : s.createdAt
    return `Session started ${d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`
  }
  return 'Untitled session'
}
