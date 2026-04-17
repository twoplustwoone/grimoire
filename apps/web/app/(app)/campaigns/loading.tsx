export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-9 w-40 bg-muted animate-pulse rounded-md" />
          <div className="h-4 w-56 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="h-9 w-36 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  )
}
