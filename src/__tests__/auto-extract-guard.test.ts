import { describe, it, expect } from 'vitest'
import {
  AUTO_EXTRACT_BUDGET_MS,
  guardReducer,
  INITIAL_GUARD_STATE,
  shouldAutoExtract,
  type GuardEvent,
  type GuardState,
} from '../ui/autoExtractGuard'

const SLOW = AUTO_EXTRACT_BUDGET_MS + 1
const FAST = AUTO_EXTRACT_BUDGET_MS - 1

function run(events: GuardEvent[], from: GuardState = INITIAL_GUARD_STATE): GuardState {
  return events.reduce(guardReducer, from)
}

describe('autoExtractGuard', () => {
  it('starts with auto-extract allowed everywhere and no prompt', () => {
    expect(INITIAL_GUARD_STATE.awaitingManual).toBe(false)
    expect(shouldAutoExtract(INITIAL_GUARD_STATE, 'page', false)).toBe(true)
    expect(shouldAutoExtract(INITIAL_GUARD_STATE, 'selection', false)).toBe(true)
    expect(shouldAutoExtract(INITIAL_GUARD_STATE, 'viewport', false)).toBe(true)
  })

  it('keeps a slow auto-extract result visible; only the next change is suppressed', () => {
    const s = run([
      { type: 'extract-started' },
      { type: 'extract-timed', mode: 'selection', elapsedMs: SLOW },
    ])
    expect(s.awaitingManual).toBe(false)
    expect(s.slow.selection).toBe(true)
    expect(shouldAutoExtract(s, 'selection', false)).toBe(false)
  })

  it('keeps a slow manual Generate result visible (regression: preview was hidden right after generating)', () => {
    const flagged = run([
      { type: 'extract-timed', mode: 'page', elapsedMs: SLOW },
      { type: 'auto-skipped' },
    ])
    expect(flagged.awaitingManual).toBe(true)

    const afterGenerate = run(
      [
        { type: 'extract-started' },
        { type: 'extract-timed', mode: 'page', elapsedMs: SLOW },
      ],
      flagged,
    )
    expect(afterGenerate.awaitingManual).toBe(false)
    expect(afterGenerate.slow.page).toBe(true)
  })

  it('a fast manual Generate lets auto-extract resume for that scope', () => {
    const s = run([
      { type: 'extract-timed', mode: 'viewport', elapsedMs: SLOW },
      { type: 'auto-skipped' },
      { type: 'extract-started' },
      { type: 'extract-timed', mode: 'viewport', elapsedMs: FAST },
    ])
    expect(s.awaitingManual).toBe(false)
    expect(shouldAutoExtract(s, 'viewport', false)).toBe(true)
  })

  it('treats exactly the budget as within budget', () => {
    const s = run([{ type: 'extract-timed', mode: 'page', elapsedMs: AUTO_EXTRACT_BUDGET_MS }])
    expect(s.slow.page).toBe(false)
  })

  it('flags are per scope', () => {
    const s = run([{ type: 'extract-timed', mode: 'page', elapsedMs: SLOW }])
    expect(shouldAutoExtract(s, 'page', false)).toBe(false)
    expect(shouldAutoExtract(s, 'selection', false)).toBe(true)
    expect(shouldAutoExtract(s, 'viewport', false)).toBe(true)
  })

  it('entering a mode grants one fresh attempt and clears that scope only', () => {
    const slowBoth = run([
      { type: 'extract-timed', mode: 'page', elapsedMs: SLOW },
      { type: 'extract-timed', mode: 'viewport', elapsedMs: SLOW },
    ])
    expect(shouldAutoExtract(slowBoth, 'viewport', true)).toBe(true)

    const entered = guardReducer(slowBoth, { type: 'mode-entered', mode: 'viewport' })
    expect(entered.slow.viewport).toBe(false)
    expect(entered.slow.page).toBe(true)
  })

  it('page change clears every scope flag', () => {
    const s = run([
      { type: 'extract-timed', mode: 'page', elapsedMs: SLOW },
      { type: 'extract-timed', mode: 'selection', elapsedMs: SLOW },
      { type: 'page-changed' },
    ])
    expect(s.slow).toEqual({ page: false, selection: false, viewport: false })
  })

  it('returns the same state object for no-op events', () => {
    const s = INITIAL_GUARD_STATE
    expect(guardReducer(s, { type: 'extract-started' })).toBe(s)
    expect(guardReducer(s, { type: 'mode-entered', mode: 'page' })).toBe(s)
    expect(guardReducer(s, { type: 'extract-timed', mode: 'page', elapsedMs: FAST })).toBe(s)
    const skipped = guardReducer(s, { type: 'auto-skipped' })
    expect(guardReducer(skipped, { type: 'auto-skipped' })).toBe(skipped)
  })
})
