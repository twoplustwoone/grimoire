export function defaultSessionTitle(d: Date = new Date()): string {
  return `Session started ${d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`
}
