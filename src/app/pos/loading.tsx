import { Skeleton } from "@/components/ui/skeleton";

export default function POSLoading() {
  return (
    <div className="space-y-6">
      {/* Top Controls / Filters Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Kanban Board Columns Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Antrean Menunggu", color: "bg-amber-500/10" },
          { label: "Area Cuci Basah", color: "bg-blue-500/10" },
          { label: "Pengeringan & Lap", color: "bg-purple-500/10" },
          { label: "Siap Diserahkan", color: "bg-emerald-500/10" },
        ].map((col, idx) => (
          <div
            key={idx}
            className="border-border/80 bg-card/60 flex flex-col space-y-3 rounded-2xl border p-3.5"
          >
            {/* Column Header Skeleton */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${col.color}`} />
                <Skeleton className="h-5 w-28 rounded-md" />
              </div>
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>

            {/* Ticket Cards Skeleton */}
            <div className="space-y-2.5">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="border-border/60 bg-card space-y-2.5 rounded-xl border p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
