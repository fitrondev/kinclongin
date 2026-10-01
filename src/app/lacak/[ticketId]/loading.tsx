import { Skeleton } from "@/components/ui/skeleton";

export default function LacakTiketLoading() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>
          <Skeleton className="h-10 w-10 rounded-2xl" />
        </div>

        {/* Vehicle Badge & Ticket Card Skeleton */}
        <div className="border-border/80 bg-card space-y-4 rounded-3xl border p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>

          <div className="space-y-2 pt-2">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>

          {/* Stepper Progress Skeleton */}
          <div className="space-y-4 pt-6">
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className="flex flex-col items-center space-y-1"
                >
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-3 w-14 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inspection & Details Card Skeleton */}
        <div className="border-border/80 bg-card space-y-4 rounded-3xl border p-6 shadow-sm">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
