import { describe, it, expect } from 'vitest'
import { emptyAuthorRecRow, parseAuthorImport, buildAuthorJsonDisk } from './authorPack'
import { defaultUiConfig } from '../types/uiConfig'

describe('authorPack helpers (T13)', () => {
  it('parseAuthorImport returns null for empty string', () => {
    expect(parseAuthorImport('   ')).toBeNull()
  })

  it('parseAuthorImport extracts recommended plugin rows', () => {
    const parsed = parseAuthorImport(
      JSON.stringify({
        summary: 'hi',
        recommended_plugins: [{ id: 'p.a', version_range: '>=1.0', note: 'n' }],
      }),
    )
    expect(parsed?.rows[0]?.id).toBe('p.a')
  })

  it('buildAuthorJsonDisk omits empty summary-only payload', () => {
    const disk = buildAuthorJsonDisk({
      summary: '',
      detailMarkdown: '',
      rows: [emptyAuthorRecRow()],
      includeSuggestedUi: false,
      uiConfig: defaultUiConfig(),
      suggestedPluginBackendsJson: '',
    })
    expect(disk).toBeUndefined()
  })

  it('preserves unknown author fields while updating managed values', () => {
    const disk = buildAuthorJsonDisk({
      summary: 'new summary',
      detailMarkdown: '',
      rows: [emptyAuthorRecRow()],
      includeSuggestedUi: false,
      uiConfig: defaultUiConfig(),
      suggestedPluginBackendsJson: '',
      currentRaw: JSON.stringify({ future_market_field: { keep: true } }),
    })
    const parsed = JSON.parse(disk!)
    expect(parsed.summary).toBe('new summary')
    expect(parsed.future_market_field).toEqual({ keep: true })
  })
})
