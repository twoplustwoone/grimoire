export default function Loading() {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded-md" />
        <div className="grid gap-4 md:grid-cols-2 mt-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
