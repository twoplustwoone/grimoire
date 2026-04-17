export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 space-y-2">
        <div className="h-4 w-32 bg-muted animate-pulse rounded-md" />
        <div className="h-9 w-64 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-80 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  )
}
