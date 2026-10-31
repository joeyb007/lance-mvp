import { fmt } from '../../domain/format'
import { useStore } from '../../state/store'

/** Demo-only controls, visually separate from the app: clock, Skip ahead 30 min, Reset demo. */
export function DemoBar() {
  const { state, dispatch } = useStore()
  return (
    <div className="flex items-center gap-2 bg-[#1F2937] px-4 py-2 text-[13px] text-white/80" data-testid="demo-bar">
      <span className="font-semibold uppercase tracking-wide text-white/50">Demo</span>
      <span className="font-semibold text-white tabular-nums" data-testid="clock">
        {fmt(state.now)}
      </span>
      <span className="flex-1" />
      <button onClick={() => dispatch({ type: 'advanceClock', minutes: 30 })} className="h-8 rounded-full bg-white/10 px-3 font-semibold text-white active:bg-white/20">
        Skip 30 min
      </button>
      <button onClick={() => dispatch({ type: 'reset' })} className="h-8 rounded-full px-3 font-semibold text-white/70 active:bg-white/10">
        Reset
      </button>
    </div>
  )
}
