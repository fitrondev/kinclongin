import { Skeleton } from "@/components/ui/skeleton";

export default function LayarCuciLoading() {
  return (
    <div className="bg-background min-h-screen space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Tablet Header Skeleton */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-36 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
      </div>

      {/* Grid of Bay Washing Slots Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((slot) => (
          <div
            key={slot}
            className="border-border/80 bg-card flex flex-col justify-between space-y-4 rounded-3xl border p-5 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-28 rounded-xl" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-4 w-52 rounded-md" />
            </div>

            {/* Big Action Button for Wet Gloves/Hands */}
            <div className="pt-2">
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
