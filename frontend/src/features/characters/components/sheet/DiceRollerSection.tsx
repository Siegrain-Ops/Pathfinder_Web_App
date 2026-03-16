import { useState } from 'react'
import { clsx }     from 'clsx'
import { SectionPanel } from './SectionPanel'

// ---------------------------------------------------------------------------
// Keyframe CSS (injected via <style> tag – no external CSS file required)
// ---------------------------------------------------------------------------
const DICE_STYLES = `
@keyframes dice-roll {
  0%   { transform: rotate(0deg)   scale(1);    }
  20%  { transform: rotate(-20deg) scale(1.18); }
  45%  { transform: rotate(18deg)  scale(1.22); }
  70%  { transform: rotate(-10deg) scale(1.12); }
  100% { transform: rotate(0deg)   scale(1);    }
}
@keyframes result-pop {
  0%   { opacity: 0; transform: scale(0.5) translateY(6px);  }
  60%  { opacity: 1; transform: scale(1.1) translateY(-2px); }
  100% { opacity: 1; transform: scale(1)   translateY(0);    }
}
@keyframes chip-appear {
  0%   { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1);   }
}
.die-rolling { animation: dice-roll 0.38s ease-out; }
.result-pop  { animation: result-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
.chip-appear { animation: chip-appear 0.2s ease-out both; }
`

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100

const ALL_DICE: DieType[] = [4, 6, 8, 10, 12, 20, 100]

interface DieCfg {
  stroke:  string  // hex color for SVG stroke
  fill:    string  // hex for SVG fill
  text:    string  // hex for SVG label text
  label:   string  // "d4", "d%", etc.
  textY:   number  // vertical center inside the shape
  shape:   'tri' | 'sq' | 'diamond' | 'penta-10' | 'penta-12' | 'circle'
}

const CFG: Record<DieType, DieCfg> = {
  4:   { stroke:'#f59e0b', fill:'#451a0360', text:'#fcd34d', label:'d4',  textY:66, shape:'tri'      },
  6:   { stroke:'#38bdf8', fill:'#082f4960', text:'#7dd3fc', label:'d6',  textY:55, shape:'sq'       },
  8:   { stroke:'#34d399', fill:'#02231860', text:'#6ee7b7', label:'d8',  textY:55, shape:'diamond'  },
  10:  { stroke:'#a78bfa', fill:'#1e1b4b60', text:'#c4b5fd', label:'d10', textY:60, shape:'penta-10' },
  12:  { stroke:'#fb7185', fill:'#1c0b0b60', text:'#fca5a5', label:'d12', textY:58, shape:'penta-12' },
  20:  { stroke:'#fbbf24', fill:'#1c130060', text:'#fde68a', label:'d20', textY:66, shape:'tri'      },
  100: { stroke:'#67e8f9', fill:'#082f4960', text:'#a5f3fc', label:'d%',  textY:55, shape:'circle'   },
}

const SHAPE_POINTS: Record<string, string> = {
  tri:       '50,8  94,84 6,84',
  diamond:   '50,6  94,50 50,94 6,50',
  'penta-10':'50,8  90,40 76,86 24,86 10,40',
  'penta-12':'50,6  92,36 78,86 22,86 8,36',
}

// ---------------------------------------------------------------------------
// DieSvg – a single die face drawn in SVG
// ---------------------------------------------------------------------------
function DieSvg({
  sides, displayValue, rolling,
}: { sides: DieType; displayValue: number | null; rolling: boolean }) {
  const cfg = CFG[sides]
  const isCrit   = sides === 20 && displayValue === 20
  const isFumble = sides === 20 && displayValue === 1
  const stroke   = isCrit ? '#fbbf24' : isFumble ? '#ef4444' : cfg.stroke
  const textFill = isCrit ? '#fde68a' : isFumble ? '#fca5a5' : cfg.text
  const pts      = SHAPE_POINTS[cfg.shape] ?? ''

  const numStr = displayValue !== null ? String(displayValue) : cfg.label
  const fontSize = numStr.length >= 3 ? 18 : numStr.length === 2 ? 24 : 28

  return (
    <svg
      viewBox="0 0 100 100"
      className={clsx('w-full h-full', rolling && 'die-rolling')}
      style={isCrit   ? { filter:'drop-shadow(0 0 10px #fbbf24)' }
           : isFumble ? { filter:'drop-shadow(0 0 10px #ef4444)' }
           : undefined}
    >
      {/* Shape */}
      {cfg.shape === 'sq' ? (
        <rect x="9" y="9" width="82" height="82" rx="11"
          fill={cfg.fill} stroke={stroke} strokeWidth="3" />
      ) : cfg.shape === 'circle' ? (
        <circle cx="50" cy="50" r="41"
          fill={cfg.fill} stroke={stroke} strokeWidth="3" />
      ) : (
        <polygon points={pts}
          fill={cfg.fill} stroke={stroke} strokeWidth="3" />
      )}

      {/* Value or label */}
      <text
        x="50" y={cfg.textY}
        textAnchor="middle" dominantBaseline="middle"
        fill={textFill}
        fontSize={fontSize}
        fontWeight="bold"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        {displayValue !== null ? displayValue : cfg.label}
      </text>

      {/* Crit / fumble banner */}
      {isCrit && (
        <text x="50" y="90" textAnchor="middle" fill="#fbbf24"
          fontSize="8" fontWeight="bold" style={{ fontFamily: 'sans-serif' }}>
          NAT 20
        </text>
      )}
      {isFumble && (
        <text x="50" y="90" textAnchor="middle" fill="#ef4444"
          fontSize="8" fontWeight="bold" style={{ fontFamily: 'sans-serif' }}>
          NAT 1
        </text>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Roll history entry
// ---------------------------------------------------------------------------
interface RollEntry {
  id:       string
  notation: string    // "3d6+2"
  sides:    DieType
  count:    number
  modifier: number
  rolls:    number[]
  total:    number
  ts:       number
}

function rollOne(sides: DieType): number {
  return Math.floor(Math.random() * (sides === 100 ? 100 : sides)) + 1
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5)  return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function DiceRollerSection() {
  const [count,    setCount]    = useState(1)
  const [sides,    setSides]    = useState<DieType>(20)
  const [modifier, setModifier] = useState(0)
  const [rollNote, setRollNote] = useState('')

  const [history,    setHistory]    = useState<RollEntry[]>([])
  const [lastRoll,   setLastRoll]   = useState<RollEntry | null>(null)
  const [rollingDie, setRollingDie] = useState<DieType | null>(null)
  const [resultKey,  setResultKey]  = useState(0) // forces animation replay

  function doRoll(s: DieType, n: number, mod: number, note: string) {
    const rolls  = Array.from({ length: n }, () => rollOne(s))
    const total  = rolls.reduce((a, b) => a + b, 0) + mod
    const dLabel = s === 100 ? '%' : s
    const notation =
      `${n > 1 ? n : ''}d${dLabel}` +
      (mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : '') +
      (note ? ` — ${note}` : '')

    const entry: RollEntry = {
      id: crypto.randomUUID(), notation, sides: s,
      count: n, modifier: mod, rolls, total, ts: Date.now(),
    }
    setLastRoll(entry)
    setResultKey(k => k + 1)
    setHistory(prev => [entry, ...prev].slice(0, 8))
  }

  function quickRoll(s: DieType) {
    setRollingDie(s)
    doRoll(s, 1, 0, '')
    setTimeout(() => setRollingDie(null), 420)
  }

  function customRoll() {
    setRollingDie(sides)
    doRoll(sides, count, modifier, rollNote)
    setTimeout(() => setRollingDie(null), 420)
  }

  // The last result on a specific die, for rendering value inside the die face
  function lastSingleResult(s: DieType): number | null {
    if (!lastRoll || lastRoll.sides !== s) return null
    if (lastRoll.count === 1 && lastRoll.modifier === 0) return lastRoll.rolls[0]
    return null
  }

  const isCrit   = lastRoll?.sides === 20 && lastRoll.rolls[0] === 20 && lastRoll.count === 1
  const isFumble = lastRoll?.sides === 20 && lastRoll.rolls[0] === 1  && lastRoll.count === 1

  return (
    <div className="flex flex-col gap-4">
      <style dangerouslySetInnerHTML={{ __html: DICE_STYLES }} />

      {/* ── Quick Roll ─────────────────────────────────────────────────────── */}
      <SectionPanel title="Dice Roller">

        {/* Die grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-5">
          {ALL_DICE.map(d => {
            const cfg = CFG[d]
            const isRolling = rollingDie === d
            return (
              <button
                key={d}
                onClick={() => quickRoll(d)}
                className="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5
                           transition-all duration-150 hover:scale-105 active:scale-95
                           hover:brightness-110 select-none"
                style={{
                  borderColor: cfg.stroke + '55',
                  background:  `radial-gradient(ellipse at center, ${cfg.fill} 0%, transparent 100%)`,
                }}
                title={`Roll ${cfg.label}`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16">
                  <DieSvg
                    sides={d}
                    displayValue={isRolling ? null : lastSingleResult(d)}
                    rolling={isRolling}
                  />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: cfg.stroke }}>
                  {cfg.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Result panel */}
        {lastRoll && (
          <div
            key={resultKey}
            className={clsx(
              'result-pop rounded-xl border px-4 py-4 mb-5',
              isCrit   ? 'border-amber-500/60 bg-amber-950/30'
              : isFumble ? 'border-red-600/50 bg-red-950/20'
              : 'border-stone-700/50 bg-stone-900/60',
            )}
          >
            <div className="flex items-center gap-4 flex-wrap">
              {/* Big total */}
              <div className="flex flex-col items-center min-w-[72px]">
                <span className={clsx(
                  'text-6xl font-bold font-mono leading-none',
                  isCrit   ? 'text-amber-300'
                  : isFumble ? 'text-red-400'
                  : 'text-stone-100',
                )}>
                  {lastRoll.total}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-stone-500 mt-1">
                  total
                </span>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {/* Notation */}
                <span className={clsx(
                  'text-sm font-semibold font-mono',
                  isCrit ? 'text-amber-400' : isFumble ? 'text-red-400' : 'text-stone-300',
                )}>
                  {lastRoll.notation}
                  {isCrit   && <span className="ml-2 text-amber-400 text-xs">✦ Critical!</span>}
                  {isFumble && <span className="ml-2 text-red-400  text-xs">✦ Fumble!</span>}
                </span>

                {/* Individual dice chips */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {lastRoll.rolls.map((v, i) => {
                    const cfg = CFG[lastRoll.sides]
                    const isMax = v === (lastRoll.sides === 100 ? 100 : lastRoll.sides)
                    const isMin = v === 1
                    return (
                      <span
                        key={i}
                        className="chip-appear rounded-md border px-2 py-0.5 text-sm font-bold font-mono"
                        style={{
                          animationDelay: `${i * 40}ms`,
                          borderColor: isMax ? '#fbbf24' : isMin ? '#ef4444' : cfg.stroke + '60',
                          color:        isMax ? '#fde68a' : isMin ? '#fca5a5' : cfg.text,
                          background:   cfg.fill,
                        }}
                      >
                        {v}
                      </span>
                    )
                  })}

                  {lastRoll.modifier !== 0 && (
                    <>
                      <span className="text-stone-600 text-sm">+</span>
                      <span className={clsx(
                        'rounded-md border border-stone-700/50 bg-stone-800/60 px-2 py-0.5 text-sm font-bold font-mono',
                        lastRoll.modifier > 0 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                        {lastRoll.modifier > 0 ? `+${lastRoll.modifier}` : lastRoll.modifier}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom roll row */}
        <div className="rounded-xl border border-stone-700/40 bg-stone-950/40 px-4 py-3">
          <span className="text-[10px] uppercase tracking-[0.14em] text-stone-500 block mb-3">
            Custom Roll
          </span>
          <div className="flex flex-wrap items-end gap-3">
            {/* Count */}
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-stone-500 uppercase tracking-wide">Count</span>
              <input
                type="number"
                min={1} max={99}
                value={count}
                onChange={e => setCount(Math.max(1, Math.min(99, Number(e.target.value))))}
                className="field w-16 text-center text-sm font-mono"
              />
            </label>

            <span className="text-stone-500 font-bold text-lg pb-1">d</span>

            {/* Die type */}
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-stone-500 uppercase tracking-wide">Die</span>
              <select
                className="field text-sm font-mono"
                value={sides}
                onChange={e => setSides(Number(e.target.value) as DieType)}
              >
                {ALL_DICE.map(d => (
                  <option key={d} value={d}>{d === 100 ? 'd%' : `d${d}`}</option>
                ))}
              </select>
            </label>

            {/* Modifier */}
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-stone-500 uppercase tracking-wide">Modifier</span>
              <input
                type="number"
                value={modifier}
                onChange={e => setModifier(Number(e.target.value))}
                className="field w-20 text-center text-sm font-mono"
              />
            </label>

            {/* Note */}
            <label className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <span className="text-[10px] text-stone-500 uppercase tracking-wide">Note (optional)</span>
              <input
                className="field text-sm"
                placeholder="Attack roll, Perception…"
                value={rollNote}
                onChange={e => setRollNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && customRoll()}
              />
            </label>

            {/* Roll button */}
            <button
              onClick={customRoll}
              className="rounded-lg border border-amber-600/60 bg-amber-950/40 px-5 py-2
                         text-sm font-semibold text-amber-300 transition-all duration-150
                         hover:bg-amber-900/50 hover:border-amber-500/70 hover:text-amber-200
                         active:scale-95"
            >
              Roll
            </button>
          </div>
        </div>
      </SectionPanel>

      {/* ── Roll History ───────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <SectionPanel
          title="Roll History"
          action={
            <button
              className="text-[10px] text-stone-600 hover:text-red-400 transition-colors uppercase tracking-wide"
              onClick={() => { setHistory([]); setLastRoll(null) }}
            >
              Clear
            </button>
          }
        >
          <div className="flex flex-col divide-y divide-stone-800/40">
            {history.map((entry, idx) => {
              const cfg   = CFG[entry.sides]
              const isC   = entry.sides === 20 && entry.rolls[0] === 20 && entry.count === 1
              const isF   = entry.sides === 20 && entry.rolls[0] === 1  && entry.count === 1
              return (
                <div
                  key={entry.id}
                  className={clsx(
                    'flex items-center gap-3 py-2 transition-opacity',
                    idx === 0 ? 'opacity-100' : 'opacity-70',
                  )}
                >
                  {/* Die icon (tiny) */}
                  <div className="w-7 h-7 shrink-0">
                    <DieSvg sides={entry.sides} displayValue={null} rolling={false} />
                  </div>

                  {/* Notation */}
                  <span className={clsx(
                    'text-xs font-mono font-semibold min-w-[72px]',
                    isC ? 'text-amber-400' : isF ? 'text-red-400' : 'text-stone-300',
                  )}>
                    {entry.notation}
                  </span>

                  {/* Individual rolls (compact) */}
                  <div className="hidden sm:flex flex-wrap gap-1 flex-1">
                    {entry.rolls.map((v, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono rounded px-1 border"
                        style={{
                          borderColor: cfg.stroke + '50',
                          color:       cfg.text,
                          background:  cfg.fill,
                        }}
                      >
                        {v}
                      </span>
                    ))}
                    {entry.modifier !== 0 && (
                      <span className={clsx(
                        'text-[10px] font-mono rounded px-1 border border-stone-700/50',
                        entry.modifier > 0 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                        {entry.modifier > 0 ? `+${entry.modifier}` : entry.modifier}
                      </span>
                    )}
                  </div>

                  {/* Total */}
                  <span className={clsx(
                    'ml-auto font-bold font-mono text-base shrink-0',
                    isC ? 'text-amber-300' : isF ? 'text-red-400' : 'text-stone-100',
                  )}>
                    {entry.total}
                  </span>

                  {/* Time */}
                  <span className="text-[10px] text-stone-600 shrink-0 w-16 text-right">
                    {timeAgo(entry.ts)}
                  </span>
                </div>
              )
            })}
          </div>
        </SectionPanel>
      )}
    </div>
  )
}
