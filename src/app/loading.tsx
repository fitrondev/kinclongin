import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Ambient background glow */}
      <div className="bg-primary/10 pointer-events-none absolute h-72 w-72 animate-pulse rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        {/* Animated Brand Logo Container */}
        <div className="shadow-primary/25 bg-primary/10 relative flex h-20 w-20 items-center justify-center rounded-3xl p-3 shadow-2xl backdrop-blur-md">
          <Image
            src="/logoipsum.svg"
            alt="Kinclongin Logo"
            width={56}
            height={56}
            className="h-12 w-12 animate-pulse object-contain"
            priority
          />
          <span className="border-primary/40 absolute -inset-1 animate-ping rounded-3xl border opacity-30" />
        </div>

        <div className="space-y-1">
          <div className="text-foreground text-base font-black tracking-tight">
            KINCLONGIN{" "}
            <span className="text-primary text-xs font-semibold">POS</span>
          </div>
          <p className="text-muted-foreground animate-pulse text-xs">
            Memuat antarmuka sistem...
          </p>
        </div>

        {/* Minimalist Progress Indicator */}
        <div className="bg-muted mt-2 h-1 w-36 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-full origin-left animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
}
