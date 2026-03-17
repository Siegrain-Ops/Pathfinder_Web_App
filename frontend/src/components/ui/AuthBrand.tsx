// ---------------------------------------------------------------------------
// AuthBrand — shared brand lockup used on all public/auth pages
// ---------------------------------------------------------------------------

export function AuthBrand() {
  return (
    <div className="text-center mb-8">
      <span className="text-amber-400 text-4xl leading-none select-none">⚔</span>
      <h1 className="font-display text-3xl font-bold mt-3 tracking-wide">
        <span className="text-stone-100">Path</span><span className="text-amber-400">Legends</span>
      </h1>
      <p className="text-stone-500 text-[11px] uppercase tracking-[0.2em] mt-2">
        Pathfinder 1e · Character Manager
      </p>
    </div>
  )
}
