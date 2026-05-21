/**
 * Shared fixture factories for renderer tests.
 * All factories return plain objects that satisfy the IR types.
 */
import type { ExportIR, ExportItem, ExportSection, TableData } from '../../types'

let nextId = 1
export function resetIds(): void {
  nextId = 1
}

export function makeItem(
  overrides: Partial<ExportItem> & Pick<ExportItem, 'content'>
): ExportItem {
  return {
    id: `item-${nextId++}`,
    kind: 'sticky',
    position: { x: 0, y: 0 },
    ...overrides,
  }
}

export function makeSection(
  title: string,
  depth: number,
  items: ExportItem[] = [],
  children: ExportSection[] = []
): ExportSection {
  return { id: `sec-${nextId++}`, title, depth, items, children }
}

export function makeMeta(overrides?: Partial<ExportIR['meta']>): ExportIR['meta'] {
  return {
    fileName: 'Workshop.fig',
    pageName: 'Page 1',
    extractedAt: '2026-05-21T12:00:00.000Z',
    mode: 'page',
    counts: { stickies: 0, text: 0, shapes: 0, tables: 0, sections: 0 },
    ...overrides,
  }
}

export function makeIR(
  overrides: Partial<ExportIR> = {}
): ExportIR {
  return {
    meta: makeMeta(),
    sections: [],
    orphans: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Named fixtures
// ---------------------------------------------------------------------------

/** IR with no sections and no orphans. */
export const emptyIR: ExportIR = makeIR()

/** IR with one orphan sticky, no sections. */
export const singleOrphanIR: ExportIR = makeIR({
  orphans: [makeItem({ content: 'Hello world' })],
})

/** IR with two flat sections, no nesting. */
export function flatSectionsIR(): ExportIR {
  resetIds()
  return makeIR({
    sections: [
      makeSection('Alpha', 0, [
        makeItem({ content: 'A1' }),
        makeItem({ content: 'A2' }),
      ]),
      makeSection('Beta', 0, [
        makeItem({ content: 'B1' }),
      ]),
    ],
  })
}

/** IR with a section that contains a nested child section. */
export function nestedSectionsIR(): ExportIR {
  resetIds()
  const child = makeSection('Inner', 1, [makeItem({ content: 'Child item' })])
  return makeIR({
    sections: [
      makeSection('Outer', 0, [makeItem({ content: 'Parent item' })], [child]),
    ],
  })
}

/** IR with items carrying vote counts. */
export function votesIR(): ExportIR {
  resetIds()
  return makeIR({
    sections: [
      makeSection('Ideas', 0, [
        makeItem({ content: 'Top idea', votes: 5 }),
        makeItem({ content: 'Second idea', votes: 1 }),
        makeItem({ content: 'No votes idea' }),
      ]),
    ],
  })
}

/** IR containing a table item. */
export function tableIR(): ExportIR {
  resetIds()
  const tableData: TableData = {
    rows: [
      ['Name', 'Role', 'Team'],
      ['Alice', 'Designer', 'UX'],
      ['Bob', 'Engineer', 'Platform'],
    ],
    hasHeader: true,
  }
  return makeIR({
    sections: [
      makeSection('Participants', 0, [
        makeItem({
          kind: 'table',
          content: 'Name | Role | Team\nAlice | Designer | UX\nBob | Engineer | Platform',
          tableData,
        }),
      ]),
    ],
  })
}

/** IR with content containing CSV/Markdown special characters. */
export function specialCharsIR(): ExportIR {
  resetIds()
  return makeIR({
    orphans: [
      makeItem({ content: 'Has a "quoted" word' }),
      makeItem({ content: 'Comma, separated, text' }),
      makeItem({ content: 'Pipe | character' }),
      makeItem({ content: 'Line\nbreak inside' }),
    ],
  })
}

/** Medium fixture: 3 sections, ~10 stickies, some votes, one nested section. */
export function mediumIR(): ExportIR {
  resetIds()
  const nested = makeSection('Subgroup', 1, [
    makeItem({ content: 'Nested sticky A', votes: 2 }),
    makeItem({ content: 'Nested sticky B' }),
  ])
  return makeIR({
    meta: makeMeta({
      fileName: 'Sprint Retro.fig',
      pageName: 'Retro Board',
      extractedAt: '2026-05-21T09:00:00.000Z',
      counts: { stickies: 10, text: 0, shapes: 0, tables: 0, sections: 3 },
    }),
    sections: [
      makeSection('Went Well', 0, [
        makeItem({ content: 'Fast CI pipeline', votes: 4 }),
        makeItem({ content: 'Great collaboration', votes: 3 }),
        makeItem({ content: 'Clear sprint goal', votes: 1 }),
      ]),
      makeSection('To Improve', 0, [
        makeItem({ content: 'Too many meetings', votes: 5 }),
        makeItem({ content: 'Unclear requirements', votes: 2 }),
        makeItem({ content: 'Flaky tests', votes: 1 }),
      ], [nested]),
      makeSection('Action Items', 0, [
        makeItem({ content: 'Schedule fewer standups' }),
        makeItem({ content: 'Write acceptance criteria' }),
        makeItem({ content: 'Fix flaky test suite' }),
      ]),
    ],
  })
}
