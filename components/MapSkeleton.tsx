// Branded loading state shown while the dynamic Map chunk is fetched.
// Matches the eventual chrome (TopBar + ChipRow + map area + sheet peek)
// so layout doesn't pop on hydration.

export default function MapSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading map"
      className="absolute inset-0 flex flex-col bg-paper"
      style={{ height: "100dvh" }}
    >
      <div
        className="border-b border-gray-200 px-3 py-2 flex items-center gap-3"
        style={{ paddingTop: "calc(var(--safe-top) + 0.5rem)" }}
      >
        <div className="shrink-0 w-12 h-9 rounded-sm bg-gray-100 animate-pulse" />
        <div className="flex-1 h-10 rounded-sm bg-gray-100 animate-pulse" />
      </div>
      <div className="border-b border-gray-100 px-3 py-2 flex items-center gap-2">
        <div className="h-9 w-16 rounded-full bg-gray-100 animate-pulse" />
        <div className="h-9 w-20 rounded-full bg-gray-100 animate-pulse" />
        <div className="h-9 w-24 rounded-full bg-gray-100 animate-pulse" />
      </div>
      <div className="relative flex-1 min-h-0 grid place-items-center">
        <div className="w-full h-full bg-[radial-gradient(circle_at_50%_40%,rgba(123,17,19,0.06),transparent_70%),repeating-linear-gradient(0deg,transparent,transparent_40px,rgba(0,0,0,0.04)_41px),repeating-linear-gradient(90deg,transparent,transparent_40px,rgba(0,0,0,0.04)_41px)]" />
        <div className="absolute font-mono text-[10px] tracking-widest uppercase text-gray-500">
          Loading map &middot;&middot;&middot;
        </div>
      </div>
      <div
        className="border-t border-gray-200 px-5 pt-3"
        style={{
          height: "calc(120px + var(--safe-bottom))",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        <div className="grid place-items-center mb-2">
          <div className="w-12 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="h-4 w-3/4 rounded-sm bg-gray-100 animate-pulse mb-2" />
        <div className="h-3 w-1/2 rounded-sm bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}
