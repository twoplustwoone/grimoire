export default function EntityLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-muted animate-pulse rounded-md" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="h-9 w-28 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="grid gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  )
}
