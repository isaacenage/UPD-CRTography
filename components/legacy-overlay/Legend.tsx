export default function Legend() {
  return (
    <div className="pointer-events-auto bg-paper/90 backdrop-blur-sm border border-gray-200 rounded-sm px-4 py-3 shadow-[0_6px_24px_-12px_rgb(26_26_26_/_0.25)]">
      <div className="font-mono text-[10px] tracking-widest uppercase text-gray-500 font-medium mb-2">
        Legend
      </div>
      <ul className="space-y-1.5">
        <li className="flex items-center gap-2.5 text-xs text-ink">
          <span
            className="inline-grid place-items-center w-4 h-4 rounded-sm border border-ink/40 text-paper text-[10px] font-bold"
            style={{ background: "#014421" }}
            aria-hidden
          >
            ✓
          </span>
          <span className="font-medium">May Bidet</span>
        </li>
        <li className="flex items-center gap-2.5 text-xs text-ink">
          <span
            className="inline-grid place-items-center w-4 h-4 rounded-sm border border-ink/40 text-paper text-[10px] font-bold"
            style={{ background: "#7B1113" }}
            aria-hidden
          >
            ✗
          </span>
          <span className="font-medium">Walang Bidet</span>
        </li>
      </ul>
    </div>
  );
}
