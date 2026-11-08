import type { SelectionMode } from '../types'

/**
 * Slow-scope guard for debounced auto-extract.
 *
 * Two separate questions are tracked here, and keeping them apart is the point:
 *
 * - `slow[mode]`: should auto-extract be suppressed for this scope? Set from the
 *   last measured round trip for that scope.
 * - `awaitingManual`: is the result on screen out of date because an
 *   auto-extract was skipped? Only this one hides the preview behind the
 *   "Generate preview" prompt.
 *
 * A result the user already has (from a slow auto-extract or a manual Generate)
 * is never hidden just because it was slow. The prompt appears only once the
 * scope changes underneath it and the guard declines to re-walk the tree.
 */

/**
 * If a scope's last measured round-trip extraction time exceeds this budget,
 * future auto-extracts for that scope are skipped until the user asks for one.
 */
export const AUTO_EXTRACT_BUDGET_MS = 1500

export type ScopeFlags = Record<SelectionMode, boolean>

export interface GuardState {
  slow: ScopeFlags
  awaitingManual: boolean
}

export const NO_SLOW_SCOPES: ScopeFlags = { page: false, selection: false, viewport: false }

export const INITIAL_GUARD_STATE: GuardState = { slow: NO_SLOW_SCOPES, awaitingManual: false }

export type GuardEvent =
  /** Auto-extract declined to run; whatever is on screen is now stale. */
  | { type: 'auto-skipped' }
  /** Any extraction (auto, manual, or one-shot copy/download) started. */
  | { type: 'extract-started' }
  /** An auto or manual extraction finished; record whether it was over budget. */
  | { type: 'extract-timed'; mode: SelectionMode; elapsedMs: number }
  /** User switched into this mode: grant one fresh attempt. */
  | { type: 'mode-entered'; mode: SelectionMode }
  /** New page: previous backoff no longer applies. */
  | { type: 'page-changed' }

export function guardReducer(state: GuardState, event: GuardEvent): GuardState {
  switch (event.type) {
    case 'auto-skipped':
      return state.awaitingManual ? state : { ...state, awaitingManual: true }
    case 'extract-started':
      return state.awaitingManual ? { ...state, awaitingManual: false } : state
    case 'extract-timed': {
      const isSlow = event.elapsedMs > AUTO_EXTRACT_BUDGET_MS
      if (state.slow[event.mode] === isSlow) return state
      return { ...state, slow: { ...state.slow, [event.mode]: isSlow } }
    }
    case 'mode-entered':
      if (!state.slow[event.mode]) return state
      return { ...state, slow: { ...state.slow, [event.mode]: false } }
    case 'page-changed':
      return { ...state, slow: NO_SLOW_SCOPES }
  }
}

/**
 * Whether the debounced auto-extract should run for `mode`. Entering a mode
 * always gets one attempt, even if that scope was flagged slow before.
 */
export function shouldAutoExtract(state: GuardState, mode: SelectionMode, modeJustChanged: boolean): boolean {
  return modeJustChanged || !state.slow[mode]
}
