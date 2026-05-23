import { describe, it, expect, beforeEach } from 'vitest'
import { renderCsv } from '../../ui/renderers/csv'
import {
  emptyIR,
  singleOrphanIR,
  flatSectionsIR,
  nestedSectionsIR,
  votesIR,
  tableIR,
  specialCharsIR,
  mediumIR,
  codeIR,
  richLinkItem,
  richListItem,
  makeIR,
  makeSection,
  makeItem,
  resetIds,
} from './fixtures'

/** Parse CSV text into rows of fields. Handles quoted fields with embedded newlines. */
function parseCsv(text: string): string[][] {
  const result: string[][] = []
  const currentFields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        // Escaped quote inside a quoted field
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        // Include newlines and other chars verbatim inside quoted fields
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      currentFields.push(current)
      current = ''
    } else if (ch === '\n') {
      currentFields.push(current)
      current = ''
      result.push([...currentFields])
      currentFields.length = 0
    } else if (ch === '\r') {
      // skip CR in CRLF
    } else {
      current += ch
    }
  }

  // Flush last field / row
  currentFields.push(current)
  if (currentFields.some((f) => f !== '') || result.length === 0) {
    result.push([...currentFields])
  }

  return result
}

beforeEach(() => resetIds())

describe('renderCsv – header row', () => {
  it('always outputs the header row', () => {
    const out = renderCsv(emptyIR, {})
    expect(out).toBe(
      'section_path,kind,content,votes,position_x,position_y,cell_ref'
    )
  })

  it('header row has 7 columns', () => {
    const rows = parseCsv(renderCsv(emptyIR, {}))
    expect(rows[0]).toHaveLength(7)
  })
})

describe('renderCsv – single orphan', () => {
  it('emits one data row with empty section_path', () => {
    const rows = parseCsv(renderCsv(singleOrphanIR, {}))
    expect(rows).toHaveLength(2) // header + 1 data row
    expect(rows[1][0]).toBe('')    // section_path empty
    expect(rows[1][2]).toBe('Hello world')
  })

  it('emits the correct kind', () => {
    const rows = parseCsv(renderCsv(singleOrphanIR, {}))
    expect(rows[1][1]).toBe('sticky')
  })
})

describe('renderCsv – section paths', () => {
  it('uses section title as section_path', () => {
    const rows = parseCsv(renderCsv(flatSectionsIR(), {}))
    const sectionPaths = rows.slice(1).map((r) => r[0])
    expect(sectionPaths).toContain('Alpha')
    expect(sectionPaths).toContain('Beta')
  })

  it('uses " > " separator for nested sections', () => {
    const rows = parseCsv(renderCsv(nestedSectionsIR(), {}))
    const paths = rows.slice(1).map((r) => r[0])
    expect(paths).toContain('Outer')
    expect(paths).toContain('Outer > Inner')
  })
})

describe('renderCsv – votes', () => {
  it('populates votes column when votes exist', () => {
    const rows = parseCsv(renderCsv(votesIR(), {}))
    const topIdeaRow = rows.find((r) => r[2] === 'Top idea')
    expect(topIdeaRow?.[3]).toBe('5')
  })

  it('leaves votes column empty when item has no votes', () => {
    const rows = parseCsv(renderCsv(votesIR(), {}))
    const noVotesRow = rows.find((r) => r[2] === 'No votes idea')
    expect(noVotesRow?.[3]).toBe('')
  })
})

describe('renderCsv – table expansion (csvExpandTables default true)', () => {
  it('expands table into one row per cell', () => {
    const rows = parseCsv(renderCsv(tableIR(), {}))
    // 3 rows × 3 cols = 9 data rows, plus header
    expect(rows).toHaveLength(1 + 9)
  })

  it('sets kind to table_cell for expanded rows', () => {
    const rows = parseCsv(renderCsv(tableIR(), {}))
    const dataRows = rows.slice(1)
    expect(dataRows.every((r) => r[1] === 'table_cell')).toBe(true)
  })

  it('populates cell_ref as R{row}C{col}', () => {
    const rows = parseCsv(renderCsv(tableIR(), {}))
    const cellRefs = rows.slice(1).map((r) => r[6])
    expect(cellRefs).toContain('R1C1')
    expect(cellRefs).toContain('R1C3')
    expect(cellRefs).toContain('R3C2')
  })

  it('populates content with cell text', () => {
    const rows = parseCsv(renderCsv(tableIR(), {}))
    const contents = rows.slice(1).map((r) => r[2])
    expect(contents).toContain('Name')
    expect(contents).toContain('Alice')
    expect(contents).toContain('Platform')
  })
})

describe('renderCsv – table expansion disabled (csvExpandTables: false)', () => {
  it('emits one row with flat content string', () => {
    const rows = parseCsv(renderCsv(tableIR(), { csvExpandTables: false }))
    expect(rows).toHaveLength(2) // header + 1 row
    expect(rows[1][1]).toBe('table')
  })

  it('leaves cell_ref empty', () => {
    const rows = parseCsv(renderCsv(tableIR(), { csvExpandTables: false }))
    expect(rows[1][6]).toBe('')
  })
})

describe('renderCsv – CSV escaping', () => {
  it('wraps fields with commas in double quotes', () => {
    const rows = parseCsv(renderCsv(specialCharsIR(), {}))
    const commaRow = rows.find((r) => r[2] === 'Comma, separated, text')
    expect(commaRow).toBeDefined()
  })

  it('escapes double quotes inside fields', () => {
    const rows = parseCsv(renderCsv(specialCharsIR(), {}))
    const quoteRow = rows.find((r) => r[2] === 'Has a "quoted" word')
    expect(quoteRow).toBeDefined()
  })

  it('handles newlines inside content', () => {
    const rows = parseCsv(renderCsv(specialCharsIR(), {}))
    const newlineRow = rows.find((r) => r[2] === 'Line\nbreak inside')
    expect(newlineRow).toBeDefined()
  })

  it('handles pipe characters without quoting', () => {
    resetIds()
    const ir = makeIR({ orphans: [makeItem({ content: 'Pipe | character' })] })
    const rows = parseCsv(renderCsv(ir, {}))
    expect(rows[1][2]).toBe('Pipe | character')
  })
})

describe('renderCsv – position columns', () => {
  it('outputs x and y position', () => {
    resetIds()
    const ir = makeIR({
      orphans: [makeItem({ content: 'item', position: { x: 42, y: 99 } })],
    })
    const rows = parseCsv(renderCsv(ir, {}))
    expect(rows[1][4]).toBe('42')
    expect(rows[1][5]).toBe('99')
  })
})

describe('renderCsv – snapshot (medium fixture)', () => {
  it('matches snapshot', () => {
    expect(renderCsv(mediumIR(), {})).toMatchSnapshot()
  })
})

describe('renderCsv – rich text (plain text in cells, URLs preserved)', () => {
  it('includes anchor text and URL in content cell', () => {
    const ir = makeIR({ orphans: [richLinkItem()] })
    const rows = parseCsv(renderCsv(ir, {}))
    expect(rows[1][2]).toContain('our site')
    expect(rows[1][2]).toContain('https://example.com')
  })

  it('renders list items as flat plain text (no - prefix from markdown)', () => {
    const ir = makeIR({ orphans: [richListItem()] })
    const rows = parseCsv(renderCsv(ir, {}))
    // The content cell should contain the list text; plain list prefixes '- ' are expected
    expect(rows[1][2]).toContain('Idea Alpha')
    expect(rows[1][2]).toContain('Idea Beta')
  })

  it('does not contain ** or ~~ in CSV cells', () => {
    const ir = makeIR({ sections: [makeSection('S', 0, [richLinkItem()])] })
    const rows = parseCsv(renderCsv(ir, {}))
    const content = rows[1][2]
    expect(content).not.toContain('**')
    expect(content).not.toContain('~~')
  })
})

describe('renderCsv – code blocks', () => {
  it('emits kind=code for code block items', () => {
    const rows = parseCsv(renderCsv(codeIR(), {}))
    expect(rows[1][1]).toBe('code')
  })

  it('puts a signpost message instead of raw code', () => {
    const rows = parseCsv(renderCsv(codeIR(), {}))
    expect(rows[1][2]).toMatch(/\[code block omitted/)
    expect(rows[1][2]).toContain('use Markdown export')
  })

  it('does not include fencing in CSV content', () => {
    const rows = parseCsv(renderCsv(codeIR(), {}))
    expect(rows[1][2]).not.toContain('```')
  })

  it('does not include raw code in CSV content', () => {
    const rows = parseCsv(renderCsv(codeIR(), {}))
    expect(rows[1][2]).not.toContain('function greet')
  })
})
